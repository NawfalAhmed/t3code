import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { AssistantCitation, ResponseContextRecord } from "@t3tools/contracts";
import {
  assistantCitationLabel,
  serializeAssistantCitation,
} from "@t3tools/shared/assistantCitations";
import { Link, useNavigate } from "@tanstack/react-router";
import { XIcon } from "lucide-react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import {
  assistantCitationNavigation,
  assistantCitationRoute,
} from "../../lib/assistantCitationNavigation";
import { cn } from "~/lib/utils";
import { useQuietThreadShell } from "~/state/entities";
import { Button } from "../ui/button";
import { textDirection } from "~/textDirection";

function useCitationSourceLinkProps(citation: AssistantCitation) {
  const navigate = useNavigate();
  const sourceThread = useQuietThreadShell(
    scopeThreadRef(citation.environmentId, citation.threadId),
  );
  return {
    ...assistantCitationRoute(citation, sourceThread),
    "data-markdown-copy": serializeAssistantCitation(citation),
    onClick: (event: ReactMouseEvent<HTMLAnchorElement>) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      event.preventDefault();
      void navigate(assistantCitationNavigation(citation, sourceThread));
    },
  };
}

const flat = (text: string) => text.replace(/\s+/g, " ");

/**
 * The card a response shows as inside a message. Clicking it goes to the source; a comment follows
 * as text. `leading` and `trailing` say it starts or ends its block, which already has spacing.
 */
function ResponseCard({
  citation,
  copyMarkdown,
  cardCopyMarkdown = copyMarkdown,
  label,
  title,
  preview,
  comment,
  leading,
  trailing,
  onRemove,
}: {
  citation: AssistantCitation;
  copyMarkdown: string;
  cardCopyMarkdown?: string;
  label: string;
  title?: string | undefined;
  preview: ReactNode;
  comment?: string | undefined;
  leading: boolean;
  trailing: boolean;
  onRemove?: (() => void) | undefined;
}) {
  const linkProps = useCitationSourceLinkProps(citation);
  return (
    // One copy boundary for the card and its comment, so a copied card carries the comment once.
    <span
      data-markdown-copy={copyMarkdown}
      className={cn("block", !leading && "mt-[0.65rem]", !trailing && "mb-[0.65rem]")}
    >
      <span className="relative block">
        <Link
          {...linkProps}
          // A selection inside the card's boundary copies the card here and the comment as text.
          data-markdown-copy={cardCopyMarkdown}
          // The response is findable in its own message; here it is clamped and mostly hidden.
          data-thread-find-ignore
          aria-label={label}
          // The message's markdown styles colour and underline links; a card is neither.
          className={cn(
            "block min-w-0 rounded-lg bg-black/10 px-2.5 py-1.5 text-start text-sm text-muted-foreground! no-underline! wrap-break-word hover:bg-black/14 focus-visible:outline-2 focus-visible:outline-ring dark:bg-black/35 dark:hover:bg-black/50",
            onRemove && "pe-8",
          )}
        >
          {title ? (
            <span className="block truncate text-xs font-medium text-foreground/80" dir="auto">
              {title}
            </span>
          ) : null}
          <span className="line-clamp-2" dir={textDirection(citation.text)}>
            {preview}
          </span>
        </Link>
        {onRemove ? (
          <span className="absolute end-1.5 top-1.5">
            <Button
              variant="ghost-muted"
              size="icon-micro"
              aria-label="Remove citation"
              onClick={onRemove}
            >
              <XIcon aria-hidden="true" />
            </Button>
          </span>
        ) : null}
      </span>
      {comment ? (
        <span className="mt-1.5 block whitespace-pre-wrap" dir={textDirection(comment)}>
          {comment}
        </span>
      ) : null}
    </span>
  );
}

/** A passage quoted from a response, with its surrounding context and the user's comment. */
export function AssistantCitationEmbed({
  citation,
  leading,
  trailing,
  onRemove,
}: {
  citation: AssistantCitation;
  leading: boolean;
  trailing: boolean;
  onRemove?: (() => void) | undefined;
}) {
  const wholeResponse = citation.prefix === "" && citation.suffix === "";
  const { comment, ...quoted } = citation;
  return (
    <ResponseCard
      citation={citation}
      copyMarkdown={serializeAssistantCitation(citation)}
      cardCopyMarkdown={serializeAssistantCitation(quoted)}
      label={`Go to quoted response: ${assistantCitationLabel(quoted)}`}
      comment={comment}
      leading={leading}
      trailing={trailing}
      onRemove={onRemove}
      preview={
        wholeResponse ? (
          flat(citation.text)
        ) : (
          <>
            {citation.prefix ? `…${flat(citation.prefix)}` : null}
            <mark className="rounded-sm bg-foreground/12 px-0.5 text-foreground">
              {flat(citation.text)}
            </mark>
            {citation.suffix ? `${flat(citation.suffix)}…` : null}
          </>
        )
      }
    />
  );
}

/** The response a message replies to: its subagents, when it had any, and how it starts. */
export function ResponseReplyCard({
  record,
  copyMarkdown,
  leading,
  trailing,
}: {
  record: ResponseContextRecord;
  copyMarkdown: string;
  leading: boolean;
  trailing: boolean;
}) {
  return (
    <ResponseCard
      citation={record.citation}
      copyMarkdown={copyMarkdown}
      label={`Go to the response this replies to: ${record.label}`}
      title={record.subagents?.map((subagent) => subagent.title).join(", ")}
      preview={flat(record.citation.text)}
      leading={leading}
      trailing={trailing}
    />
  );
}
