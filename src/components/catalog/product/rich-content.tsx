import {
  safeHref,
  sanitizeDocument,
  type InlineNode,
  type RichDocument,
} from "@/modules/catalog/content/document";

function Inlines({ nodes }: { nodes: InlineNode[] }) {
  return nodes.map((node, index) => {
    if (node.type === "link") {
      const href = safeHref(node.href);
      if (!href) {
        return <span key={index}>{node.text}</span>;
      }
      const external = href.startsWith("http://") || href.startsWith("https://");
      return (
        <a
          key={index}
          href={href}
          className="underline underline-offset-4"
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {node.text}
        </a>
      );
    }
    if (node.bold) {
      return <strong key={index}>{node.text}</strong>;
    }
    return <span key={index}>{node.text}</span>;
  });
}

/** Renders a sanitized document as React nodes. No raw HTML. */
export function RichContent({ document }: { document: RichDocument }) {
  const safe = sanitizeDocument(document);
  if (safe.blocks.length === 0) {
    return null;
  }

  return (
    <div className="max-w-3xl space-y-4 text-sm leading-7 text-foreground">
      {safe.blocks.map((block, index) => {
        if (block.type === "heading") {
          if (block.level === 3) {
            return (
              <h4 key={index} className="text-base font-medium tracking-tight">
                {block.text}
              </h4>
            );
          }
          return (
            <h3 key={index} className="text-lg font-medium tracking-tight">
              {block.text}
            </h3>
          );
        }
        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag
              key={index}
              className={block.ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <Inlines nodes={item} />
                </li>
              ))}
            </ListTag>
          );
        }
        return (
          <p key={index}>
            <Inlines nodes={block.children} />
          </p>
        );
      })}
    </div>
  );
}
