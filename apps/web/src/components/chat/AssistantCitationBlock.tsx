import type { AssistantCitation } from "@t3tools/contracts";
import {
  assistantCitationLabel,
  serializeAssistantCitation,
} from "@t3tools/shared/assistantCitations";
import { Link, useNavigate } from "@tanstack/react-router";
import { XIcon } from "lucide-react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import {
  assistantCitationHash,
  assistantCitationNavigation,
} from "../../lib/assistantCitationNavigation";
import { textDirection } from "~/textDirection";
import { Button } from "../ui/button";

// Spans, not divs: sent messages render citations inside markdown paragraphs.
export function AssistantCitationBlock({
  citation,
  comment,
  onRemove,
}: {
  citation: AssistantCitation;
  /** Replaces the read-only comment, e.g. with the composer's comment field. */
  comment?: ReactNode;
  onRemove?: (() => void) | undefined;
}) {
  const navigate = useNavigate();
  const label = assistantCitationLabel(citation);
  return (
    <span
      data-slot="assistant-citation"
      data-markdown-copy={serializeAssistantCitation(citation)}
      className="my-1.5 flex w-full min-w-0 items-start gap-2 rounded-lg border border-input px-2.5 py-2 whitespace-normal"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Link
          to="/$environmentId/$threadId"
          params={{ environmentId: citation.environmentId, threadId: citation.threadId }}
          hash={assistantCitationHash(citation)}
          resetScroll={false}
          draggable={false}
          data-slot="assistant-citation-quote"
          aria-label={`View cited assistant text: ${label}`}
          dir={textDirection(citation.text)}
          className="line-clamp-3 rounded-xs border-l-2 border-(--context-chip-citation) pl-2.5 whitespace-normal wrap-break-word text-muted-foreground no-underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--context-chip-citation)"
          onClick={(event: ReactMouseEvent<HTMLAnchorElement>) => {
            if (
              event.button !== 0 ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            ) {
              return;
            }
            event.preventDefault();
            void navigate(assistantCitationNavigation(citation));
          }}
        >
          {citation.text}
        </Link>
        {comment ??
          (citation.comment ? (
            <span
              className="whitespace-pre-wrap wrap-break-word"
              dir={textDirection(citation.comment)}
            >
              {citation.comment}
            </span>
          ) : null)}
      </span>
      {onRemove ? (
        <Button
          variant="ghost-muted"
          size="icon-micro"
          aria-label="Remove citation"
          className="-my-0.5 shrink-0"
          onClick={onRemove}
        >
          <XIcon aria-hidden="true" />
        </Button>
      ) : null}
    </span>
  );
}
