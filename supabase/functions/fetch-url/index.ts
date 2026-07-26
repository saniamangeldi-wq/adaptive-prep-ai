 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const authHeader = req.headers.get("Authorization");
     if (!authHeader) {
       return new Response(JSON.stringify({ error: "Unauthorized" }), {
         status: 401,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     const supabase = createClient(
       Deno.env.get("SUPABASE_URL") ?? "",
       Deno.env.get("SUPABASE_ANON_KEY") ?? "",
       { global: { headers: { Authorization: authHeader } } }
     );
 
     const { data: { user }, error: authError } = await supabase.auth.getUser();
     if (authError || !user) {
       return new Response(JSON.stringify({ error: "Unauthorized" }), {
         status: 401,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
      const { url } = await req.json();
 
      if (!url || !isValidUrl(url)) {
        return new Response(JSON.stringify({ error: "Invalid URL" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // SSRF protection: reject private, loopback, link-local, and metadata targets.
      if (!(await isPublicUrl(url))) {
        return new Response(JSON.stringify({ error: "URL host is not allowed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch the website (do not automatically follow redirects — re-validate each hop)
      let currentUrl = url;
      let response: Response | null = null;
      for (let i = 0; i < 3; i++) {
        response = await fetch(currentUrl, {
          redirect: "manual",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; AdaptivePrep/1.0; +https://adaptiveprep.app)",
          },
        });
        if (response.status >= 300 && response.status < 400) {
          const loc = response.headers.get("location");
          if (!loc) break;
          const next = new URL(loc, currentUrl).href;
          if (!isValidUrl(next) || !(await isPublicUrl(next))) {
            return new Response(JSON.stringify({ error: "Redirect target not allowed" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          currentUrl = next;
          continue;
        }
        break;
      }
      if (!response) throw new Error("No response");
 
     if (!response.ok) {
       return new Response(JSON.stringify({ error: "Failed to fetch URL" }), {
         status: 400,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     const html = await response.text();
     const doc = new DOMParser().parseFromString(html, "text/html");
 
     if (!doc) {
       return new Response(JSON.stringify({ error: "Failed to parse HTML" }), {
         status: 500,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Extract metadata
     const title = doc.querySelector("title")?.textContent || 
                   doc.querySelector('meta[property="og:title"]')?.getAttribute("content") || 
                   "Untitled";
     
     const description = doc.querySelector('meta[name="description"]')?.getAttribute("content") || 
                        doc.querySelector('meta[property="og:description"]')?.getAttribute("content") || 
                        "";
     
     let favicon = doc.querySelector('link[rel="icon"]')?.getAttribute("href") || 
                   doc.querySelector('link[rel="shortcut icon"]')?.getAttribute("href") || 
                   "/favicon.ico";
     
     // Make favicon absolute URL
     try {
       favicon = new URL(favicon, url).href;
     } catch {
       favicon = "";
     }
 
     // Remove scripts, styles, nav, footer for cleaner content
    const elementsToRemove = doc.querySelectorAll("script, style, nav, footer, header, .advertisement, .ads, aside") || [];
    for (const el of elementsToRemove) {
      el.parentNode?.removeChild(el);
    }
 
     // Get main content
     const mainContent = doc.querySelector("article, main, .content, #content, [role='main']") || doc.body;
     let content = mainContent?.textContent || "";
     
     // Clean up whitespace
     content = content
       .replace(/\s+/g, " ")
       .trim()
       .substring(0, 10000); // Limit to 10k chars
 
     return new Response(
       JSON.stringify({
         title: title.trim(),
         description: description.trim(),
         favicon,
         content,
         url,
       }),
       {
         status: 200,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       }
     );
   } catch (error) {
     console.error("URL fetch error:", error);
     return new Response(
       JSON.stringify({ error: "Failed to fetch URL" }),
       {
         status: 500,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       }
     );
   }
 });
 
function isValidUrl(string: string): boolean {
   try {
     const url = new URL(string);
     return url.protocol === "http:" || url.protocol === "https:";
   } catch {
     return false;
   }
 }

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast/reserved
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === "::1" || v === "::") return true;
  if (v.startsWith("fc") || v.startsWith("fd")) return true; // ULA
  if (v.startsWith("fe80")) return true; // link-local
  if (v.startsWith("::ffff:")) {
    const mapped = v.slice(7);
    return isPrivateIPv4(mapped);
  }
  return false;
}

async function isPublicUrl(raw: string): Promise<boolean> {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^\[|\]$/g, "");
    if (!host) return false;
    if (host.toLowerCase() === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) return false;

    const ipv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
    const ipv6 = host.includes(":");
    if (ipv4) return !isPrivateIPv4(host);
    if (ipv6) return !isPrivateIPv6(host);

    // Resolve DNS and reject if any answer is private.
    let addrs: string[] = [];
    try {
      const a = await Deno.resolveDns(host, "A").catch(() => [] as string[]);
      const aaaa = await Deno.resolveDns(host, "AAAA").catch(() => [] as string[]);
      addrs = [...a, ...aaaa];
    } catch {
      return false;
    }
    if (addrs.length === 0) return false;
    for (const ip of addrs) {
      if (ip.includes(":") ? isPrivateIPv6(ip) : isPrivateIPv4(ip)) return false;
    }
    return true;
  } catch {
    return false;
  }
}
