import { useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { uploadLogo, saveBranding } from "../lib/db";

const inputCls = "w-full rounded-xl border border-[#E5E4E0] bg-white px-4 py-3 text-sm text-[#0D0D0D] outline-none focus:border-[#0D0D0D] placeholder:text-[#6B6B6B] transition-colors";
const btnPrimary = "rounded-xl bg-[#0D0D0D] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-40 transition-opacity";

export default function Settings() {
  const { profile, user, refreshProfile } = useAuth();

  const fileRef = useRef(null);
  const [logoPreview, setLogoPreview] = useState(profile?.logo_url || null);
  const [logoFile, setLogoFile] = useState(null);
  const [brandColor, setBrandColor] = useState(profile?.brand_color || "#0D0D0D");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  if (profile?.plan !== "business") return <Navigate to="/" replace />;

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      let logoUrl = profile?.logo_url;
      if (logoFile) {
        logoUrl = await uploadLogo(user.id, logoFile);
      }
      await saveBranding(user.id, { logoUrl, brandColor });
      await refreshProfile();
      setLogoFile(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveLogo() {
    setSaving(true);
    setError("");
    try {
      await saveBranding(user.id, { logoUrl: null });
      await refreshProfile();
      setLogoPreview(null);
      setLogoFile(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">Branding</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#0D0D0D]">Brand</h2>
      <p className="mt-1 text-sm text-[#6B6B6B]">Your logo and color will be used when automated email sending is available.</p>

      {error && (
        <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
      )}

      {/* ── Logo ── */}
      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B] mb-4">Logo</p>
        <div className="flex items-center gap-5">
          <div
            onClick={() => fileRef.current?.click()}
            className="h-20 w-20 rounded-2xl border-2 border-dashed border-[#E5E4E0] bg-white flex items-center justify-center cursor-pointer hover:border-[#0D0D0D] transition-colors overflow-hidden shrink-0"
          >
            {logoPreview
              ? <img src={logoPreview} alt="Logo" className="h-full w-full object-contain p-1" />
              : <span className="text-[#6B6B6B] text-xs text-center px-2">Click to upload</span>
            }
          </div>
          <div className="space-y-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-[#E5E4E0] bg-white px-3 py-1.5 text-xs font-medium text-[#0D0D0D] hover:bg-[#F5F4F0] transition-colors">
              {logoPreview ? "Change logo" : "Upload logo"}
            </button>
            {logoPreview && (
              <button type="button" onClick={handleRemoveLogo} disabled={saving}
                className="block rounded-lg border border-red-100 bg-white px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors">
                Remove logo
              </button>
            )}
            <p className="text-xs text-[#6B6B6B]">PNG or SVG recommended. Max 2 MB.</p>
          </div>
        </div>
      </div>

      {/* ── Brand color ── */}
      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B] mb-4">Brand color</p>
        <div className="flex items-center gap-4">
          <div
            className="h-10 w-10 rounded-xl border border-[#E5E4E0] cursor-pointer shrink-0 overflow-hidden"
            style={{ backgroundColor: brandColor }}
            onClick={() => document.getElementById("colorPicker").click()}
          >
            <input
              id="colorPicker"
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="opacity-0 w-full h-full cursor-pointer"
            />
          </div>
          <input
            type="text"
            value={brandColor}
            onChange={(e) => {
              const val = e.target.value;
              if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) setBrandColor(val);
            }}
            maxLength={7}
            className="w-32 rounded-xl border border-[#E5E4E0] bg-white px-4 py-2.5 text-sm text-[#0D0D0D] outline-none focus:border-[#0D0D0D] font-mono transition-colors"
            placeholder="#0D0D0D"
          />
          <p className="text-xs text-[#6B6B6B]">Used as accent color on invoices and emails.</p>
        </div>
      </div>

      {/* ── Preview ── */}
      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B] mb-4">Preview</p>
        <div className="rounded-2xl border border-[#E5E4E0] bg-white overflow-hidden">
          <div className="h-1.5 w-full" style={{ backgroundColor: brandColor }} />
          <div className="px-6 py-5 flex items-center gap-4">
            {logoPreview
              ? <img src={logoPreview} alt="Logo" className="h-10 w-auto object-contain" />
              : <div className="h-10 w-24 rounded-lg bg-[#F5F4F0] flex items-center justify-center text-xs text-[#6B6B6B]">Your logo</div>
            }
            <div>
              <p className="text-sm font-semibold text-[#0D0D0D]">{profile?.username || "Your name"}</p>
              <p className="text-xs text-[#6B6B6B]">Invoice · how it will appear to clients</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Save ── */}
      <div className="mt-8 flex items-center gap-4">
        <button onClick={handleSave} disabled={saving} className={btnPrimary}>
          {saving ? "Saving…" : "Save branding"}
        </button>
        {saved && <p className="text-sm text-emerald-600">Saved.</p>}
      </div>
    </div>
  );
}
