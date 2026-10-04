import test from "node:test";
import assert from "node:assert/strict";
import { hasAdminSession, isAdminView, isVisitorPreview, setVisitorPreview } from "./adminView.ts";

class MemoryStorage implements Storage {
    private values = new Map<string, string>();

    get length() {
        return this.values.size;
    }

    clear() {
        this.values.clear();
    }

    getItem(key: string) {
        return this.values.get(key) ?? null;
    }

    key(index: number) {
        return [...this.values.keys()][index] ?? null;
    }

    removeItem(key: string) {
        this.values.delete(key);
    }

    setItem(key: string, value: string) {
        this.values.set(key, String(value));
    }
}

Object.defineProperty(globalThis, "localStorage", { value: new MemoryStorage(), configurable: true });
Object.defineProperty(globalThis, "sessionStorage", { value: new MemoryStorage(), configurable: true });

test("visitor preview keeps the admin session while presenting the public view", () => {
    localStorage.setItem("jwt", "admin-token");

    assert.equal(hasAdminSession(), true);
    assert.equal(isAdminView(), true);
    assert.equal(isVisitorPreview(), false);

    setVisitorPreview(true);

    assert.equal(localStorage.getItem("jwt"), "admin-token");
    assert.equal(isAdminView(), false);
    assert.equal(isVisitorPreview(), true);
});

test("leaving visitor preview restores the admin view", () => {
    localStorage.setItem("jwt", "admin-token");
    setVisitorPreview(true);
    setVisitorPreview(false);

    assert.equal(isAdminView(), true);
    assert.equal(isVisitorPreview(), false);
});

test("visitor preview cannot create an admin session", () => {
    localStorage.clear();
    setVisitorPreview(true);

    assert.equal(hasAdminSession(), false);
    assert.equal(isAdminView(), false);
    assert.equal(isVisitorPreview(), false);
});
