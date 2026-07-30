"use client";

import { useState, useRef } from "react";
import { Upload, ExternalLink, X, Sparkles, RefreshCw, ShoppingBag, LayoutGrid, List, ChevronDown, Globe, Package, Shirt } from "lucide-react";
import Antigravity from "@/components/ui/Antigravity";

const API_URL = "http://localhost:8000";

const SITE_TEMPLATES: Record<string, string> = {
  "Amazon India": "https://www.amazon.in/s?k={query}",
  "Amazon US": "https://www.amazon.com/s?k={query}",
  "Flipkart": "https://www.flipkart.com/search?q={query}",
  "eBay": "https://www.ebay.com/sch/i.html?_nkw={query}",
};

const SITE_SHORT_LABELS: Record<string, string> = {
  "Amazon India": "Amazon IN",
  "Amazon US": "Amazon US",
  "Flipkart": "Flipkart",
  "eBay": "eBay",
};

type SearchResult = {
  path: string;
  score: number;
  product_name: string;
  price?: string | number | null;
  source?: string;
  link?: string;
};

const MOCK_RESULTS: SearchResult[] = [
  { path: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400", score: 0.94, product_name: "Classic Black Leather Sneakers", price: "₹2,499" },
  { path: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400", score: 0.91, product_name: "Urban High-Top Trainers", price: "₹3,199" },
  { path: "https://images.unsplash.com/photo-1519415943484-9fa1873496d4?w=400", score: 0.88, product_name: "Retro Canvas Sneakers", price: "₹1,899" },
  { path: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400", score: 0.85, product_name: "Everyday Running Shoes", price: "₹2,799" },
  { path: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=400", score: 0.82, product_name: "Minimal White Low-Tops", price: "₹2,199" },
];

type SortOption = "match" | "price-low" | "price-high";
type SearchMode = "catalog" | "web";

function parsePrice(price?: string | number | null): number {
  if (!price) return 0;
  if (typeof price === "number") return price;
  return parseInt(price.replace(/[^0-9]/g, ""), 10) || 0;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [numResults, setNumResults] = useState(5);
  const [site, setSite] = useState("Amazon India");
  const [dragOver, setDragOver] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<SortOption>("match");
  const [searchMode, setSearchMode] = useState<SearchMode>("catalog");
  const [complementaryResults, setComplementaryResults] = useState<SearchResult[]>([]);
  const [complementaryLoading, setComplementaryLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFile = (selected: File) => {
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setResults([]);
    setComplementaryResults([]);
    setNumResults(5);
    doSearch(selected, 5, searchMode);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) loadFile(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) loadFile(dropped);
  };

  const doSearch = async (targetFile: File, k: number, mode: SearchMode) => {
    setLoading(true);
    const formData = new FormData();
    formData.append("file", targetFile);
    const endpoint = mode === "catalog" ? "/search" : "/web-search";

    try {
      const res = await fetch(API_URL + endpoint + "?k=" + k, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("API not reachable");
      const data = await res.json();
      setResults(data.results);
    } catch (err) {
      setResults(MOCK_RESULTS.slice(0, k));
    } finally {
      setLoading(false);
    }

    if (mode === "catalog") {
      fetchComplementary(targetFile);
    } else {
      setComplementaryResults([]);
    }
  };

  const fetchComplementary = async (targetFile: File) => {
    setComplementaryLoading(true);
    const formData = new FormData();
    formData.append("file", targetFile);

    try {
      const res = await fetch(API_URL + "/complementary?k=5", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("API not reachable");
      const data = await res.json();
      setComplementaryResults(data.results);
    } catch (err) {
      setComplementaryResults([]);
    } finally {
      setComplementaryLoading(false);
    }
  };

  const switchMode = (mode: SearchMode) => {
    setSearchMode(mode);
    if (file) {
      setResults([]);
      setComplementaryResults([]);
      setNumResults(5);
      doSearch(file, 5, mode);
    }
  };

  const resetSearch = () => {
    setFile(null);
    setPreviewUrl(null);
    setResults([]);
    setComplementaryResults([]);
    setNumResults(5);
  };

  const buildLink = (productName: string) => {
    const template = SITE_TEMPLATES[site];
    return template.replace("{query}", encodeURIComponent(productName));
  };

  const resolveImageSrc = (r: SearchResult) => {
    if (searchMode === "web") return r.path;
    if (r.path.startsWith("http")) return r.path;
    return API_URL + "/images/" + r.path.replace(/^data\//, "");
  };

  const resolveBuyHref = (r: SearchResult) => {
    return searchMode === "web" ? (r.link || "#") : buildLink(r.product_name);
  };

  const resolveBuyLabel = (r: SearchResult) => {
    return searchMode === "web" ? "View on " + (r.source || "site") : "Buy on " + SITE_SHORT_LABELS[site];
  };

  const sortedResults = [...results].sort((a, b) => {
    if (sortBy === "match") return b.score - a.score;
    if (sortBy === "price-low") return parsePrice(a.price) - parsePrice(b.price);
    if (sortBy === "price-high") return parsePrice(b.price) - parsePrice(a.price);
    return 0;
  });

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-gradient-to-b from-neutral-50 via-white to-neutral-100 text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
      />

      <div className="fixed inset-0 -z-10 opacity-100 pointer-events-none">
        <Antigravity
          count={200}
          magnetRadius={7}
          ringRadius={7}
          waveSpeed={0.4}
          waveAmplitude={1}
          particleSize={1.2}
          lerpSpeed={0.05}
          color="#EA580C"
          autoAnimate
          particleVariance={1}
          rotationSpeed={0}
          depthFactor={1}
          pulseSpeed={3}
          particleShape="capsule"
          fieldStrength={10}
        />
      </div>

      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center">
              <Sparkles size={14} className="text-orange-400" />
            </div>
            <span className="font-bold text-base tracking-tight">SnapFind</span>
            <span className="text-[10px] font-semibold bg-orange-50 text-orange-600 border border-orange-200 rounded-full px-2 py-0.5">
              v2.0 Beta
            </span>
          </div>

          {searchMode === "catalog" && (
            <div className="relative">
              <select
                value={site}
                onChange={(e) => setSite(e.target.value)}
                className="appearance-none text-sm font-medium bg-slate-900 text-white rounded-full pl-4 pr-9 py-2 cursor-pointer focus:outline-none hover:bg-slate-800 transition-colors"
              >
                {Object.keys(SITE_TEMPLATES).map((s) => (
                  <option key={s} value={s} className="bg-white text-slate-900">{s}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white pointer-events-none" />
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 pt-16 pb-24">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-3 py-1 mb-5">
            ⚡ AI-Powered Visual Match
          </div>
          <h1 className="text-[40px] font-extrabold tracking-tight mb-3 leading-[1.1] bg-gradient-to-r from-slate-900 via-neutral-800 to-slate-700 bg-clip-text text-transparent">
            Find any product from a single photo
          </h1>
          <p className="text-slate-500 text-base leading-relaxed max-w-md mx-auto mb-6">
            Upload an image to instantly discover visually similar items across online stores.
          </p>

          <div className="inline-flex items-center bg-slate-100 rounded-full p-1">
            <button
              onClick={() => switchMode("catalog")}
              className={"flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full transition-colors " + (searchMode === "catalog" ? "bg-white shadow-sm text-slate-900" : "text-slate-400")}
            >
              <Package size={13} /> Catalog Match
            </button>
            <button
              onClick={() => switchMode("web")}
              className={"flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full transition-colors " + (searchMode === "web" ? "bg-white shadow-sm text-slate-900" : "text-slate-400")}
            >
              <Globe size={13} /> Search the Web
            </button>
          </div>
        </div>

        {!previewUrl ? (
          <div className="max-w-2xl mx-auto">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={
                "relative flex flex-col items-center justify-center rounded-2xl py-20 cursor-pointer transition-all duration-300 border bg-white/60 backdrop-blur-sm " +
                (dragOver
                  ? "border-slate-900 shadow-lg shadow-slate-900/10 scale-[1.01]"
                  : "border-slate-200/80 border-dashed hover:border-slate-400 hover:shadow-md hover:shadow-slate-900/5")
              }
            >
              <div className="relative w-14 h-14 flex items-center justify-center mb-4">
                <span className="absolute inline-flex h-full w-full rounded-full bg-orange-400/20 animate-ping" />
                <div className="relative w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center">
                  <Upload size={18} className="text-white" />
                </div>
              </div>
              <p className="text-slate-900 font-semibold text-base mb-1">
                Drop a photo here or tap to upload
              </p>
              <p className="text-slate-400 text-sm">JPG, PNG, WebP up to 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 mb-12">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-5 h-fit shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Source Image</span>
                <button
                  onClick={resetSearch}
                  className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                  aria-label="Remove image"
                >
                  <X size={12} />
                </button>
              </div>
              <img
                src={previewUrl}
                alt="Query"
                className="w-full aspect-square object-cover rounded-xl border border-slate-100 mb-3"
              />
              <div className="space-y-1.5 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>File</span>
                  <span className="text-slate-700 font-medium truncate max-w-[140px]">{file?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mode</span>
                  <span className="text-slate-700 font-medium">{searchMode === "catalog" ? "Catalog Match" : "Search the Web"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status</span>
                  <span className={loading ? "text-orange-500 font-medium" : "text-emerald-600 font-medium"}>
                    {loading ? "Analyzing..." : "Complete"}
                  </span>
                </div>
              </div>
              <button
                onClick={resetSearch}
                className="w-full mt-4 text-xs text-slate-400 hover:text-slate-900 underline underline-offset-2"
              >
                Upload different photo
              </button>
            </div>

            <div>
              {loading ? (
                <div>
                  <div className="flex items-center gap-2 mb-6 text-slate-500 text-sm">
                    <RefreshCw size={14} className="animate-spin" />
                    {searchMode === "catalog" ? "Analyzing visual features..." : "Searching the web..."}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="aspect-[4/5] bg-slate-200 rounded-2xl mb-2" />
                        <div className="h-3 bg-slate-200 rounded mb-2 w-3/4" />
                        <div className="h-3 bg-slate-200 rounded mb-3 w-1/2" />
                        <div className="h-9 bg-slate-200 rounded-lg" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : results.length > 0 && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <ShoppingBag size={15} />
                      Showing {results.length} {searchMode === "catalog" ? "visually similar matches" : "web matches"}
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="text-xs font-medium border border-slate-200 rounded-full px-3 py-1.5 bg-white text-slate-600 focus:outline-none cursor-pointer"
                      >
                        <option value="match">Sort: Highest Match</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                      </select>

                      <div className="flex items-center bg-slate-100 rounded-full p-1">
                        <button
                          onClick={() => setViewMode("grid")}
                          className={"p-1.5 rounded-full transition-colors " + (viewMode === "grid" ? "bg-white shadow-sm text-slate-900" : "text-slate-400")}
                          aria-label="Grid view"
                        >
                          <LayoutGrid size={14} />
                        </button>
                        <button
                          onClick={() => setViewMode("list")}
                          className={"p-1.5 rounded-full transition-colors " + (viewMode === "list" ? "bg-white shadow-sm text-slate-900" : "text-slate-400")}
                          aria-label="List view"
                        >
                          <List size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                      {sortedResults.map((r, i) => (
                        <div
                          key={i}
                          className="group rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-sm overflow-hidden hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300"
                        >
                          <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
                            <img
                              src={resolveImageSrc(r)}
                              alt={r.product_name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            {searchMode === "catalog" && (
                              <span className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md text-white text-[11px] font-medium px-2.5 py-1 rounded-full border border-white/20">
                                {(r.score * 100).toFixed(0)}% match
                              </span>
                            )}
                            {searchMode === "web" && r.source && (
                              <span className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md text-white text-[11px] font-medium px-2.5 py-1 rounded-full border border-white/20">
                                {r.source}
                              </span>
                            )}
                          </div>
                          <div className="p-3">
                            <p className="text-sm font-semibold text-slate-800 line-clamp-1 mb-1">
                              {r.product_name}
                            </p>
                            <p className="text-sm font-bold text-slate-900 mb-3">
                              {r.price ? (typeof r.price === "number" ? "$" + r.price : r.price) : (searchMode === "catalog" ? "₹1,999" : "—")}
                            </p>
                            <a
                              href={resolveBuyHref(r)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-lg py-2 shadow-md shadow-orange-500/20 transition-colors whitespace-nowrap"
                            >
                              <span className="truncate">{resolveBuyLabel(r)}</span>
                              <ExternalLink size={11} className="flex-shrink-0" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sortedResults.map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-sm p-3 hover:shadow-md transition-all duration-300"
                        >
                          <img
                            src={resolveImageSrc(r)}
                            alt={r.product_name}
                            className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{r.product_name}</p>
                            <p className="text-xs text-slate-400">
                              {searchMode === "catalog" ? (r.score * 100).toFixed(0) + "% match" : r.source} · {r.price ? (typeof r.price === "number" ? "$" + r.price : r.price) : "—"}
                            </p>
                          </div>
                          <a
                            href={resolveBuyHref(r)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-lg px-4 py-2 shadow-md shadow-orange-500/20 transition-colors flex-shrink-0"
                          >
                            {searchMode === "catalog" ? "Buy" : "View"}
                            <ExternalLink size={11} />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  {numResults < 10 && file && (
                    <div className="text-center mt-10">
                      <button
                        onClick={() => {
                          setNumResults(10);
                          doSearch(file, 10, searchMode);
                        }}
                        className="inline-flex items-center gap-2 text-sm font-medium border border-slate-200 rounded-full px-6 py-2.5 text-slate-700 hover:border-slate-900 hover:bg-slate-50 transition-colors"
                      >
                        Show more results
                      </button>
                    </div>
                  )}

                  {searchMode === "catalog" && (complementaryLoading || complementaryResults.length > 0) && (
                    <div className="mt-14 pt-10 border-t border-slate-200/80">
                      <div className="flex items-center gap-2 mb-6">
                        <Shirt size={16} className="text-orange-600" />
                        <h2 className="text-base font-bold text-slate-900">Complete the Look</h2>
                        <span className="text-xs text-slate-400">— items that pair well, from a different category</span>
                      </div>

                      {complementaryLoading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="animate-pulse">
                              <div className="aspect-[4/5] bg-slate-200 rounded-2xl mb-2" />
                              <div className="h-3 bg-slate-200 rounded mb-2 w-3/4" />
                              <div className="h-3 bg-slate-200 rounded w-1/2" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
                          {complementaryResults.map((r, i) => (
                            <div
                              key={i}
                              className="group rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-sm overflow-hidden hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300"
                            >
                              <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
                                <img
                                  src={resolveImageSrc(r)}
                                  alt={r.product_name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <span className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md text-white text-[11px] font-medium px-2.5 py-1 rounded-full border border-white/20">
                                  {(r.score * 100).toFixed(0)}% pair
                                </span>
                              </div>
                              <div className="p-3">
                                <p className="text-sm font-semibold text-slate-800 line-clamp-1 mb-1">
                                  {r.product_name}
                                </p>
                                <a
                                  href={buildLink(r.product_name)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2 transition-colors whitespace-nowrap"
                                >
                                  <span className="truncate">Buy on {SITE_SHORT_LABELS[site]}</span>
                                  <ExternalLink size={11} className="flex-shrink-0" />
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}