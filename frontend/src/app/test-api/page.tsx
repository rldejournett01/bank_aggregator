"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function TestApiPage() {
  const [msg, setMsg] = useState("Loading...");

  useEffect(() => {
    apiFetch<{ message: string }>("/")
      .then((r) => setMsg(r.message))
      .catch((e) => setMsg(String(e.message ?? e)));
  }, []);

  return <main style={{ padding: 24 }}>{msg}</main>;
}