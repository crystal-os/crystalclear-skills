import { clickup } from "@/lib/providers/clickup";
import { realtime } from "@/runtime/realtime";

export const agent = {
  clickup: {
    create: clickup.createTask,
    update: clickup.updateTask,
    close: clickup.closeTask,
    list: clickup.getTasks,
  },
  realtime,
};
