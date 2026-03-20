import { theme } from "../theme/theme";
import { MarkdownMessageComponent } from "./markdown-message";

export class UserMessageComponent extends MarkdownMessageComponent {
  constructor(text: string) {
    super(text, 1, {
      bgColor: (line) => theme.userBg(line),
      color: (line) => theme.userText(line),
    });
  }
}
