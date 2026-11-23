import { z } from "zod";
import { diagramSpec } from "./artifacts";
import { Behavior, Type, type FunctionDeclaration, type Schema } from "@google/genai";
import { prisma } from "../db";
import { readableBookFilter } from "../book-store-access";
import { destinations, diagrams, whiteboardArgs, type ServerTool } from "./tools";

export function liveTools(model: string) {
  const string = { type: Type.STRING };
  const tool = (name: string, description: string, properties: Record<string, Schema> = {}): FunctionDeclaration => ({
    name, description,
    ...(model === "gemini-3.8-live-extended-thinking" ? { behavior: Behavior.NON_BLOCKING } : {}),
    parameters: { type: Type.OBJECT, properties, required: Object.keys(properties) },
  });
  return [
    tool("global_search","Search the learner's accessible catalog by topic, keyword or book title.",{query:string}),
    tool("search_within_book","Search within an accessible book by ID.",{bookId:string,query:string}),
    {name:"list_library",description:"List books readable by the learner, optionally filtered by subject.",
      parameters:{type:Type.OBJECT,properties:{subject:string}}},
    tool("get_exam_history","Return the signed-in learner's most recent completed exams."),
    tool("get_study_streak","Return the current learner's recorded streak and weekly goal."),
    tool("get_due_revisions","Count flashcards currently due for the learner."),
    tool("continue_reading","Open the most recent accessible topic from the learner's reading history."),
    tool("spotlight_element","Highlight a unique exact quote in the published Reader or show enlarged text from it.",{quote:string,zoom:{type:Type.BOOLEAN}}),
    tool("show_concept_animation","Show a step-by-step concept walkthrough.",{title:string,steps:{type:Type.ARRAY,items:string}}),
    {
      name:"draw_whiteboard", description:"Draw simple paths with x from 0 to 320 and y from 0 to 200.",
      parametersJsonSchema:z.toJSONSchema(whiteboardArgs),
    },
    tool("generate_topic_notes","Start background study notes for an accessible topic when the learner wants detailed notes. The saved result appears in Assistant Results.",{topicId:string,language:{...string,enum:["bn","en","bilingual"]}}),
    tool("find_reference_image","Find attributed educational images on Wikimedia Commons.",{query:string}),
    {
      name:"edit_custom_diagram",description:"Revise the most recent custom diagram with an updated geometry specification.",
      ...(model === "gemini-3.8-live-extended-thinking" ? { behavior:Behavior.NON_BLOCKING } : {}),
      parametersJsonSchema:z.toJSONSchema(z.object({spec:diagramSpec})),
    },
    tool("go_to_page","Open an absolute page number in the currently shared PDF.",{page:{type:Type.INTEGER}}),
    {
      name:"build_custom_diagram",description:"Create an educational 3D diagram from bounded geometry. Use simple shapes, truthful labels and explicit connections.",
      ...(model === "gemini-3.8-live-extended-thinking" ? { behavior:Behavior.NON_BLOCKING } : {}),
      parametersJsonSchema:z.toJSONSchema(z.object({title:z.string().max(120),spec:diagramSpec})),
    },
    tool("navigate_app", "Open an app screen. Use exam-history for past results.", {destination:{...string,enum:[...destinations]}}),
    tool("control_reader", "Set the published Reader theme or change its text size.", {setting:{...string,enum:["paper","sepia","midnight","larger-text","smaller-text"]}}),
    tool("open_diagram_3d", "Open an existing educational 3D model.", {model:{...string,enum:[...diagrams]}}),
    tool("get_my_progress", "Return the signed-in learner's own reading progress."),
    tool("find_books_by_author", "Find accessible published books by author.", {author:string}),
    tool("get_book_toc", "Read the contents of an accessible book by ID.", {bookId:string}),
    tool("find_topic", "Find accessible topics by title or breadcrumb. Ask the user if multiple matches are relevant.", {query:string}),
    tool("get_topic_content", "Retrieve the actual publication text for a topic before explaining or making source-based notes.", {topicId:string}),
    tool("open_topic", "Open the selected, accessible topic by ID.", {topicId:string}),
    tool("show_example_card", "Show a clearly labeled example alongside the conversation.", {title:string,text:string}),
    tool("make_structured_notes", "After reading the actual topic, show 1 to 12 study points in a card for the user to save.", {
      topicId:string,title:string,points:{type:Type.ARRAY,items:string},
    }),
  ];
}

export async function runServerTool(tool: ServerTool, actor: {token:string; userId:string}) {
  // Also constrain administrators to published material within learner-facing tools.
  const book = { AND:[await readableBookFilter(actor.token), {isPublished:true}] };
  if (tool.name === "get_my_progress") {
    const where = { userId:actor.userId, book };
    const [started, completed, activity] = await Promise.all([
      prisma.readingProgress.count({where}),
      prisma.readingProgress.count({where:{...where,isCompleted:true}}),
      prisma.readingProgress.aggregate({where,_sum:{timeSpentSeconds:true}}),
    ]);
    return {started,completed,timeSpentSeconds:activity._sum.timeSpentSeconds ?? 0};
  }
  if (tool.name === "find_books_by_author") return {books:await prisma.book.findMany({
    where:{...book,author:{contains:tool.args.author,mode:"insensitive"}},
    select:{id:true,title:true,author:true},orderBy:{title:"asc"},take:20,
  })};
  const visible = { book,isPublished:true };
  if (tool.name === "get_book_toc") return {topics:await prisma.bookTopic.findMany({
    where:{...visible,bookId:tool.args.bookId},
    select:{id:true,topicTitle:true,builderPath:true,chapterTitle:true,sectionTitle:true},
    orderBy:{orderIndex:"asc"},take:100,
  })};
  if (tool.name === "find_topic") return {topics:await prisma.bookTopic.findMany({
    where:{...visible,OR:["topicTitle","builderPath","chapterTitle","sectionTitle"].map(field => ({[field]:{contains:tool.args.query,mode:"insensitive"}}))},
    select:{id:true,bookId:true,topicTitle:true,builderPath:true,chapterTitle:true,sectionTitle:true,book:{select:{title:true}}},
    orderBy:[{bookId:"asc"},{orderIndex:"asc"}],take:15,
  })};
  const topic = await prisma.bookTopic.findFirst({
    where:{...visible,id:tool.args.topicId},
    select:{id:true,bookId:true,topicTitle:true,chapterTitle:true,sectionTitle:true,builderPath:true,contentMarkdown:true,book:{select:{title:true}}},
  });
  return topic ? { topic:{...topic,contentMarkdown:topic.contentMarkdown?.slice(0,12000),truncated:(topic.contentMarkdown?.length ?? 0)>12000} } :
    { error:"Topic unavailable." };
}
