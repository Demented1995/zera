"use client";

import { useRef } from "react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  parseRichSource,
  safeHref,
  type ContentBlock,
  type InlineNode,
} from "@/modules/catalog/content/document";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hint?: string;
};

function insertAround(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string,
): { next: string; cursor: number } {
  const selected = value.slice(start, end) || "text";
  const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
  return { next, cursor: start + before.length + selected.length + after.length };
}

function InlinePreview({ nodes }: { nodes: InlineNode[] }) {
  return (
    <>
      {nodes.map((node, index) => {
        if (node.type === "link") {
          const href = safeHref(node.href);
          if (!href) {
            return <span key={index}>{node.text}</span>;
          }
          return (
            <a key={index} href={href} className="underline underline-offset-2" rel="noreferrer">
              {node.text}
            </a>
          );
        }
        if (node.bold) {
          return <strong key={index}>{node.text}</strong>;
        }
        return <span key={index}>{node.text}</span>;
      })}
    </>
  );
}

function BlockPreview({ block }: { block: ContentBlock }) {
  if (block.type === "heading") {
    return block.level === 3 ? (
      <h4 className="text-sm font-semibold">{block.text}</h4>
    ) : (
      <h3 className="text-base font-semibold">{block.text}</h3>
    );
  }
  if (block.type === "list") {
    const ListTag = block.ordered ? "ol" : "ul";
    return (
      <ListTag className={block.ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}>
        {block.items.map((item, index) => (
          <li key={index}>
            <InlinePreview nodes={item} />
          </li>
        ))}
      </ListTag>
    );
  }
  return (
    <p>
      <InlinePreview nodes={block.children} />
    </p>
  );
}

export function RichTextField({ id, label, value, onChange, disabled = false, hint }: Props) {
  const area = useRef<HTMLTextAreaElement>(null);
  const preview = parseRichSource(value);

  function apply(before: string, after = "") {
    const node = area.current;
    const start = node?.selectionStart ?? value.length;
    const end = node?.selectionEnd ?? value.length;
    const result = insertAround(value, start, end, before, after);
    onChange(result.next);
    requestAnimationFrame(() => {
      node?.focus();
      node?.setSelectionRange(result.cursor, result.cursor);
    });
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {disabled ? null : (
        <div className="flex flex-wrap gap-2">
          <ToolbarButton onClick={() => apply("## ", "\n")}>Titlu</ToolbarButton>
          <ToolbarButton onClick={() => apply("### ", "\n")}>Subtitlu</ToolbarButton>
          <ToolbarButton onClick={() => apply("- ", "\n")}>Listă</ToolbarButton>
          <ToolbarButton onClick={() => apply("**", "**")}>Evidențiat</ToolbarButton>
          <ToolbarButton onClick={() => apply("[", "](https://)")}>Link</ToolbarButton>
        </div>
      )}
      <Textarea
        ref={area}
        id={id}
        value={value}
        disabled={disabled}
        rows={6}
        onChange={(event) => onChange(event.target.value)}
      />
      {preview.blocks.length > 0 ? (
        <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3 text-sm leading-6">
          {preview.blocks.map((block, index) => (
            <BlockPreview key={index} block={block} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
}: {
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="rounded-md border border-border px-2 py-1 text-xs"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
