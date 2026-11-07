import { parseRichSource } from "@/modules/catalog/content/document";
import type { ProductTranslation } from "@/modules/catalog/content/translation";
import type {
  CustomerPreviewPayload,
  PreviewControl,
  PreviewProductCopy,
} from "@/modules/catalog/preview/types";
import type { ShopLocale } from "@/modules/shop/locale";
import { localizePhrase } from "@/modules/shop/phrases";

function documentOr(source: string, current: PreviewProductCopy["description"]) {
  const next = parseRichSource(source);
  return next.blocks.length > 0 ? next : current;
}

function localizeControl(control: PreviewControl, locale: ShopLocale): PreviewControl {
  const label = localizePhrase(locale, control.label);
  if (control.kind === "text") {
    return { ...control, label, valueLabel: localizePhrase(locale, control.valueLabel) };
  }
  if (control.kind === "select") {
    return {
      ...control,
      label,
      options: control.options.map((option) => ({
        ...option,
        label: localizePhrase(locale, option.label),
      })),
    };
  }
  if (control.kind === "checks") {
    return {
      ...control,
      label,
      options: control.options.map((option) => ({
        ...option,
        label: localizePhrase(locale, option.label),
      })),
    };
  }
  if (control.kind === "quantities") {
    return {
      ...control,
      label,
      lines: control.lines.map((line) => ({
        ...line,
        label: localizePhrase(locale, line.label),
      })),
    };
  }
  return { ...control, label };
}

export function localizeCustomer(
  customer: CustomerPreviewPayload,
  locale: ShopLocale,
  translation?: ProductTranslation | null,
): CustomerPreviewPayload {
  const copy = customer.productCopy;
  const ru = locale === "ru" ? translation : null;
  const nextCopy = copy
    ? {
        ...copy,
        description: ru?.descriptionSource
          ? documentOr(ru.descriptionSource, copy.description)
          : copy.description,
        highlightsDocument: ru?.highlightsSource
          ? documentOr(ru.highlightsSource, copy.highlightsDocument)
          : copy.highlightsDocument,
        careDocument: ru?.careSource ? documentOr(ru.careSource, copy.careDocument) : copy.careDocument,
        warrantyDocument: ru?.warrantySource
          ? documentOr(ru.warrantySource, copy.warrantyDocument)
          : copy.warrantyDocument,
        deliveryDocument: ru?.deliverySource
          ? documentOr(ru.deliverySource, copy.deliveryDocument)
          : copy.deliveryDocument,
        extraSpecs:
          ru && ru.extraSpecs.some((spec) => spec.label.trim() || spec.value.trim())
            ? ru.extraSpecs
            : copy.extraSpecs.map((spec) => ({
                ...spec,
                label: localizePhrase(locale, spec.label),
              })),
        specs: copy.specs.map((spec) => ({
          label: localizePhrase(locale, spec.label),
          value: localizePhrase(locale, spec.value),
        })),
        seo: {
          ...copy.seo,
          title: ru?.seoTitle || copy.seo.title,
          description: ru?.seoDescription || copy.seo.description,
        },
      }
    : copy;

  return {
    ...customer,
    model: {
      ...customer.model,
      name: ru?.name || customer.model.name,
      shortDescription: ru?.shortDescription || customer.model.shortDescription,
    },
    gallery: customer.gallery.map((image) =>
      image.isPrimary && ru?.primaryAltText
        ? { ...image, alt: ru.primaryAltText }
        : image,
    ),
    sections: customer.sections.map((section) => ({
      ...section,
      title: localizePhrase(locale, section.title),
    })),
    controls: customer.controls.map((control) => localizeControl(control, locale)),
    notices: customer.notices.map((notice) => localizePhrase(locale, notice)),
    price: {
      ...customer.price,
      message: customer.price.message ? localizePhrase(locale, customer.price.message) : null,
    },
    productCopy: nextCopy,
  };
}
