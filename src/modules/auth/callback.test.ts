import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { safeStaffCallback } from "@/modules/auth/callback";

describe("staff login return path", () => {
  it("keeps an admin path and drops external or protocol-relative targets", () => {
    assert.equal(safeStaffCallback("/admin/comenzi?status=NEW"), "/admin/comenzi?status=NEW");
    assert.equal(safeStaffCallback("https://evil.example/admin"), "/admin");
    assert.equal(safeStaffCallback("//evil.example"), "/admin");
    assert.equal(safeStaffCallback("/\\evil.example"), "/admin");
    assert.equal(safeStaffCallback("/admin/../login"), "/admin");
    assert.equal(safeStaffCallback("/admin/%2e%2e/login"), "/admin");
    assert.equal(safeStaffCallback("/%2f%2fevil.example"), "/admin");
  });
});
