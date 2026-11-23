import { prisma } from "../db";

export async function resolveAssistantStudyChannel() {
  return prisma.aiChannelConfig.findFirst({
    where:{channelId:"study-content",isEnabled:true},
    select:{modelId:true,credentialSlot:true},
  });
}

export async function recordAssistantToolRun(userId:string,name:string,model:string | undefined,failed:boolean) {
  await prisma.aiToolRun.create({data:{
    userId,channelId:"live-voice",resultType:name.slice(0,100),modelUsed:model,
    status:failed?"failed":"completed",
  }});
}
