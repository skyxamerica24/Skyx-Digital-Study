import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { createSearchIndex } from "../search-index";

type ReadTool = z.infer<typeof learnerToolSchema>;
const query = z.string().trim().min(2).max(120);
const bookId = z.string().min(1).max(200);
export const learnerToolSchema = z.discriminatedUnion("name",[
  z.object({name:z.literal("global_search"),args:z.object({query})}),
  z.object({name:z.literal("search_within_book"),args:z.object({bookId,query})}),
  z.object({name:z.literal("list_library"),args:z.object({subject:query.optional()})}),
  z.object({name:z.literal("get_exam_history"),args:z.object({})}),
  z.object({name:z.literal("get_study_streak"),args:z.object({})}),
  z.object({name:z.literal("get_due_revisions"),args:z.object({})}),
]);

export async function runLearnerTool(tool:ReadTool,userId:string,book:Prisma.BookWhereInput) {
  switch (tool.name) {
    case "get_exam_history":
      return {attempts:await prisma.examAttempt.findMany({
        where:{userId,status:"completed"},orderBy:{createdAt:"desc"},take:10,
        select:{examTitle:true,correctCount:true,totalQuestions:true,accuracyPercent:true,createdAt:true},
      })};
    case "get_study_streak": {
      const profile = await prisma.user.findUnique({where:{id:userId},select:{studyStreakDays:true,weeklyGoalMinutes:true}});
      return profile ?? {error:"Profile unavailable.",code:"NOT_FOUND"};
    }
    case "get_due_revisions": {
      const due = await prisma.flashcard.count({where:{
        userId,nextReviewAt:{lte:new Date()},OR:[{bookId:null},{book}],
      }});
      return {due};
    }
    case "list_library":
      return {books:await prisma.book.findMany({
        where:{AND:[book,...(tool.args.subject?[{subject:{contains:tool.args.subject,mode:"insensitive" as const}}]:[])]},
        select:{id:true,title:true,author:true,subject:true},orderBy:{title:"asc"},take:25,
      })};
  }

  const source = tool.args.query.normalize("NFC");
  const terms = [...new Set(source.match(/[\p{L}\p{M}\p{N}]+/gu) ?? [])].slice(0,8);
  if (!terms.length) return {error:"Enter a book title or a topic keyword.",code:"INVALID_QUERY"};
  const base = {book,isPublished:true,...(tool.name==="search_within_book"?{bookId:tool.args.bookId}:{})};
  const candidates = await prisma.bookTopic.findMany({
    where:{...base,OR:terms.flatMap(term=>[
      ...["topicTitle","chapterTitle","sectionTitle","builderPath","searchTokens"].map(field=>({[field]:{contains:term,mode:"insensitive"}})),
      {book:{title:{contains:term,mode:"insensitive"}}},
    ])},
    select:{id:true,bookId:true,topicTitle:true,chapterTitle:true,sectionTitle:true,builderPath:true,searchTokens:true,book:{select:{title:true}}},
    orderBy:[{bookId:"asc"},{orderIndex:"asc"}],take:250,
  });
  const index = createSearchIndex(candidates,row=>[row.topicTitle,[
    row.chapterTitle,row.sectionTitle,row.builderPath,row.searchTokens,row.book.title,
  ].filter(Boolean).join(" ")]);
  const topics = index(source,12).map(({searchTokens,...row})=>row);
  if (topics.length) return {topics};
  return {
    error:"No topic matches those keywords. Try a shorter title or another spelling.",
    code:"NOT_FOUND",
    suggestions:candidates.slice(0,4).map(row=>({id:row.id,title:row.topicTitle})),
  };
}

export async function getLatestReadingTopic(userId:string,book:Prisma.BookWhereInput) {
  const progress = await prisma.readingProgress.findMany({
    where:{userId,book,topicId:{not:null}},orderBy:{updatedAt:"desc"},take:30,
    select:{bookId:true,topicId:true},
  });
  const topics = await prisma.bookTopic.findMany({
    where:{isPublished:true,book,id:{in:progress.flatMap(row=>row.topicId?[row.topicId]:[])}},
    select:{id:true,bookId:true,topicTitle:true,book:{select:{title:true}}},
  });
  for (const row of progress) {
    const topic = topics.find(item=>item.id===row.topicId && item.bookId===row.bookId);
    if (topic) return topic;
  }
  return null;
}
