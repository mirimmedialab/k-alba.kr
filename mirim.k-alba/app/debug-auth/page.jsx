"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DebugAuthPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setData({ error: "Not logged in" });
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setData({
        user_id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
        profile: profile,
        user_type_from_metadata: user.user_metadata?.user_type,
        user_type_from_profile: profile?.user_type,
      });
      setLoading(false);
    }
    check();
  }, []);

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ padding: 40, fontFamily: "monospace", fontSize: 13 }}>
      <h1 style={{ marginBottom: 20, fontSize: 18 }}>Auth Debug Info</h1>
      <pre style={{
        background: "#f5f5f5",
        padding: 20,
        borderRadius: 8,
        overflow: "auto",
        lineHeight: 1.6
      }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
