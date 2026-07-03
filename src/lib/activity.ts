import { prisma } from "@/lib/prisma";

type ActivityType =
  | "CREATE_ORDER"
  | "EDIT_ORDER"
  | "CANCEL_ORDER"
  | "CONFIRM_PAYMENT"
  | "CLOSE_TABLE";

export async function logActivity(params: {
  type: ActivityType;
  tableName: string;
  detail: string;
  amount?: number;
}) {
  await prisma.activityLog.create({
    data: {
      type: params.type,
      tableName: params.tableName,
      detail: params.detail,
      amount: params.amount,
    },
  });
}
