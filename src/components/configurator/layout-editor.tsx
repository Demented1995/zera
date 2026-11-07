"use client";

import { useState } from "react";
import { GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { saveConfiguratorLayoutAction } from "@/modules/configurator/layout-actions";
import {
  configuratorItemLabel,
  configuratorSectionMeta,
  moveList,
  moveConfiguratorSection,
  type ConfiguratorSectionSetting,
} from "@/modules/configurator/layout";

type Props = {
  initial: ConfiguratorSectionSetting[];
};

type DragState =
  | { type: "section"; index: number }
  | { type: "item"; sectionIndex: number; index: number };

export function LayoutEditor({ initial }: Props) {
  const [sections, setSections] = useState(initial);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function clearStatus() {
    setMessage(null);
    setError(null);
  }

  function toggleSection(index: number) {
    clearStatus();
    setSections((current) =>
      current.map((section, itemIndex) =>
        itemIndex === index ? { ...section, enabled: !section.enabled } : section,
      ),
    );
  }

  function toggleItem(sectionIndex: number, itemIndex: number) {
    clearStatus();
    setSections((current) =>
      current.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              items: section.items.map((item, nestedIndex) =>
                nestedIndex === itemIndex ? { ...item, enabled: !item.enabled } : item,
              ),
            }
          : section,
      ),
    );
  }

  function dropSection(index: number) {
    if (drag?.type === "section") {
      setSections((current) => moveConfiguratorSection(current, drag.index, index));
      clearStatus();
    }
    setDrag(null);
  }

  function dropItem(sectionIndex: number, index: number) {
    if (drag?.type === "item" && drag.sectionIndex === sectionIndex) {
      setSections((current) =>
        current.map((section, sectionPosition) =>
          sectionPosition === sectionIndex
            ? { ...section, items: moveList(section.items, drag.index, index) }
            : section,
        ),
      );
      clearStatus();
    }
    setDrag(null);
  }

  async function save() {
    setPending(true);
    clearStatus();
    const result = await saveConfiguratorLayoutAction(sections);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMessage(result.message);
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {sections.map((section, index) => {
          const meta = configuratorSectionMeta(section.id);
          return (
            <li key={section.id} className="px-3 py-3">
              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => dropSection(index)}
                className="flex items-center gap-3"
              >
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.stopPropagation();
                    setDrag({ type: "section", index });
                  }}
                  className="cursor-grab text-muted-foreground"
                  aria-label={`Mută ${meta.label}`}
                >
                  <GripVertical />
                </button>
                <label className="flex min-w-0 flex-1 items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={section.enabled}
                    onChange={() => toggleSection(index)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{meta.label}</span>
                    <span className="block text-xs text-muted-foreground">{meta.detail}</span>
                  </span>
                </label>
                <span className="text-xs text-muted-foreground">
                  {section.enabled ? "Inclusă" : "Ascunsă"}
                </span>
              </div>
              {section.items.length > 0 ? (
                <ul className="mt-2 space-y-1 border-l border-border pl-8">
                  {section.items.map((item, itemIndex) => (
                    <li
                      key={item.id}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.stopPropagation();
                        dropItem(index, itemIndex);
                      }}
                      className="flex items-center gap-3 rounded-lg px-2 py-1.5"
                    >
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => {
                          event.stopPropagation();
                          setDrag({ type: "item", sectionIndex: index, index: itemIndex });
                        }}
                        className="cursor-grab text-muted-foreground"
                        aria-label={`Mută ${configuratorItemLabel(section.id, item.id)}`}
                      >
                        <GripVertical className="size-4" />
                      </button>
                      <label className="flex min-w-0 flex-1 items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={() => toggleItem(index, itemIndex)}
                        />
                        <span>{configuratorItemLabel(section.id, item.id)}</span>
                      </label>
                      <span className="text-xs text-muted-foreground">
                        {item.enabled ? "Inclus" : "Ascuns"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={pending} onClick={() => void save()}>
          {pending ? "Se salvează…" : "Salvează structura"}
        </Button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
