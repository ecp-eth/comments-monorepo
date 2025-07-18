import type { Bot, Context } from "grammy";
import type { ManagementCommentDbService } from "../../management/services/comment-db-service";
import type { CommentDbService } from "../comment-db-service";
import type { ResolveAuthorFunction } from "../types";

/**
 * We have an enum for all menu ids because grammy uses the id directly in payload and payloads
 * have limited length so we want to keep them short.
 */
export enum MenuId {
  REPORT_MAIN_MENU = "0",
  REPORT_CHANGE_STATUS_SUBMENU = "1",
  MODERATE_MAIN_MENU = "2",
  MODERATE_CHANGE_STATUS_SUBMENU = "3",
  MODERATE_COMMENT_PREVIEW_MENU = "4",
}

export type IAdminTelegramBotServiceCommand_RegisterOptions = {
  bot: Bot<AdminTelegramBotServiceContext>;
};

export interface IAdminTelegramBotServiceCommand {
  getDefinition: () => {
    command: string;
    description: string;
    help: string;
  };

  /**
   * Called by bot service to register the command.
   * @param options - Options for registration.
   */
  register: (options: IAdminTelegramBotServiceCommand_RegisterOptions) => void;
}

export type AdminTelegramBotServiceContext = Context & {
  commentManagementDbService: ManagementCommentDbService;
  commentDbService: CommentDbService;
  resolveAuthor: ResolveAuthorFunction;
};
