import Link from "next/link";

import {
  MIRROR_STATUS_LABEL,
  MIRROR_STATUSES,
  ORDER_STATUS_LABEL,
  ORDER_STATUSES,
} from "@/modules/orders/public";

type Props = {
  q: string;
  status: string;
  mirror: string;
};

function hrefFor(q: string, status: string, mirror: string): string {
  const params = new URLSearchParams();
  if (q.trim()) {
    params.set("q", q.trim());
  }
  if (status !== "ALL") {
    params.set("status", status);
  }
  if (mirror !== "ALL") {
    params.set("oglinda", mirror);
  }
  const search = params.toString();
  return search ? `/admin/comenzi?${search}` : "/admin/comenzi";
}

function Chip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-8 items-center rounded border px-3 text-xs ${
        active
          ? "border-[#445868] bg-white font-medium text-[#243140]"
          : "border-[#d5d8de] bg-white text-[#4b5563] hover:border-[#445868]"
      }`}
    >
      {label}
    </Link>
  );
}

export function OrderFilters({ q, status, mirror }: Props) {
  const orderFilters = [
    { id: "ALL", label: "Toate" },
    ...ORDER_STATUSES.map((item) => ({ id: item, label: ORDER_STATUS_LABEL[item] })),
  ];
  const mirrorFilters = [
    { id: "ALL", label: "Toate" },
    ...MIRROR_STATUSES.map((item) => ({ id: item, label: MIRROR_STATUS_LABEL[item] })),
  ];

  return (
    <div className="space-y-2 bg-[#f3f4f6] px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-28 text-[11px] font-medium tracking-wide text-[#6b7280] uppercase">
          Status comandă
        </span>
        {orderFilters.map((item) => (
          <Chip
            key={item.id}
            href={hrefFor(q, item.id, mirror)}
            active={item.id === status}
            label={item.label}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-28 text-[11px] font-medium tracking-wide text-[#6b7280] uppercase">
          Statut oglindă
        </span>
        {mirrorFilters.map((item) => (
          <Chip
            key={item.id}
            href={hrefFor(q, status, item.id)}
            active={item.id === mirror}
            label={item.label}
          />
        ))}
        <form action="/admin/comenzi" className="ml-auto">
          {status !== "ALL" ? <input type="hidden" name="status" value={status} /> : null}
          {mirror !== "ALL" ? <input type="hidden" name="oglinda" value={mirror} /> : null}
          <input
            name="q"
            defaultValue={q}
            placeholder="Caută"
            className="h-8 w-44 rounded border border-[#d5d8de] bg-white px-2 text-xs"
          />
        </form>
      </div>
    </div>
  );
}
