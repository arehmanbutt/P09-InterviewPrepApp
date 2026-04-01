"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@clerk/nextjs";
import { toast } from "sonner";
import { Loader2, Save, Paintbrush } from "lucide-react";
import LogoUpload from "app/components/branding/LogoUpload";
import ColorPicker from "app/components/branding/ColorPicker";
import BrandProvider from "app/components/branding/BrandProvider";
import UpgradePrompt from "app/components/subscription/UpgradePrompt";
import { useSubscription } from "app/hooks/useSubscription";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card } from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";
import { PageHeader } from "@/app/components/ui/page-header";
import { EmptyState } from "@/app/components/ui/empty-state";

export default function BrandingPage() {
  const { organization, isLoaded } = useOrganization();
  const { isBusiness, isLoading: subLoading } = useSubscription();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#6D28D9");
  const [secondaryColor, setSecondaryColor] = useState("#09090B");
  const [companyName, setCompanyName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization?.id) return;
    fetch(`/api/organizations/${organization.id}/branding`)
      .then((r) => r.json())
      .then((data) => {
        if (data.branding) {
          setLogoUrl(data.branding.logoUrl ?? null);
          setPrimaryColor(data.branding.primaryColor ?? "#6D28D9");
          setSecondaryColor(data.branding.secondaryColor ?? "#09090B");
          setCompanyName(data.branding.companyName ?? "");
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [organization?.id]);

  const handleSave = async () => {
    if (!organization?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/organizations/${organization.id}/branding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl, primaryColor, secondaryColor, companyName }),
      });
      if (res.ok) {
        toast.success("Branding saved");
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Failed to save");
      }
    } catch {
      toast.error("Failed to save branding");
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded || subLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!isBusiness) {
    return (
      <div className="mx-auto max-w-lg pt-20">
        <UpgradePrompt feature="Custom branding" requiredTier="business" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="mx-auto max-w-lg pt-20">
        <EmptyState
          icon={Paintbrush}
          title="No Organization Selected"
          description="Switch to an organization to manage branding."
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Custom Branding"
        description="Customize how your interview links and reports look to candidates"
      />

      <Card className="p-6 space-y-6">
        {/* Company Name */}
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Company Name</label>
          <Input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Your Company"
          />
        </div>

        {/* Logo */}
        <LogoUpload currentLogo={logoUrl} onUpload={setLogoUrl} onRemove={() => setLogoUrl(null)} />

        {/* Colors */}
        <ColorPicker label="Primary Color" value={primaryColor} onChange={setPrimaryColor} />
        <ColorPicker label="Secondary Color" value={secondaryColor} onChange={setSecondaryColor} />

        {/* Preview */}
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Preview</label>
          <BrandProvider primaryColor={primaryColor} secondaryColor={secondaryColor}>
            <div
              className="rounded-lg border border-border p-6"
              style={{ backgroundColor: secondaryColor }}
            >
              <div className="flex items-center gap-3 mb-4">
                {logoUrl && (
                  <img src={logoUrl} alt="Logo" className="h-8 w-8 object-contain" /> // eslint-disable-line @next/next/no-img-element
                )}
                <span className="text-lg font-bold" style={{ color: primaryColor }}>
                  {companyName || "Your Company"}
                </span>
              </div>
              <div
                className="rounded-lg px-4 py-2 text-sm font-medium text-center"
                style={{ backgroundColor: primaryColor, color: secondaryColor }}
              >
                Join Interview
              </div>
            </div>
          </BrandProvider>
        </div>

        {/* Save */}
        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Branding
        </Button>
      </Card>
    </div>
  );
}
