import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import { Loader2, Save, Ruler, Globe } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Measurements = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    chest: "",
    waist: "",
    hips: "",
    height: "",
    weight: "",
    fit_preference: "regular",
    country: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("chest, waist, hips, height, weight, fit_preference, country")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm({
            chest: data.chest?.toString() || "",
            waist: data.waist?.toString() || "",
            hips: data.hips?.toString() || "",
            height: data.height?.toString() || "",
            weight: data.weight?.toString() || "",
            fit_preference: data.fit_preference || "regular",
            country: (data as any).country || "",
          });
        }
        setLoading(false);
      });
  }, [user]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          chest: form.chest ? parseFloat(form.chest) : null,
          waist: form.waist ? parseFloat(form.waist) : null,
          hips: form.hips ? parseFloat(form.hips) : null,
          height: form.height ? parseFloat(form.height) : null,
          weight: form.weight ? parseFloat(form.weight) : null,
          fit_preference: form.fit_preference,
          country: form.country || null,
        } as any)
        .eq("id", user.id);

      if (error) throw error;
      toast({ title: "Settings saved! 📏" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="glass rounded-2xl p-8">
        <h2 className="font-display text-xl font-semibold mb-2 flex items-center gap-2">
          <Ruler className="w-5 h-5 text-primary" />
          Body Measurements
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          One-time setup so your suit always fits — no wardrobe malfunctions.
        </p>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Country */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
              <Globe className="w-3 h-3" /> Country / Region
            </label>
            <Select
              value={form.country}
              onValueChange={(val) => setForm((f) => ({ ...f, country: val }))}
            >
              <SelectTrigger className="bg-secondary/50 border-border/50 h-11">
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.flag} {c.name} ({c.currencySymbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "chest", label: "Chest (inches)", placeholder: "38" },
              { key: "waist", label: "Waist (inches)", placeholder: "32" },
              { key: "hips", label: "Hips (inches)", placeholder: "40" },
              { key: "height", label: "Height (cm)", placeholder: "175" },
              { key: "weight", label: "Weight (kg)", placeholder: "70" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground mb-1.5 block">{label}</label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder={placeholder}
                  value={(form as any)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="bg-secondary/50 border-border/50 h-11"
                />
              </div>
            ))}
          </div>

          {/* Fit Preference */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Fit Preference</label>
            <div className="grid grid-cols-3 gap-2">
              {["tight", "regular", "relaxed"].map((pref) => (
                <button
                  key={pref}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, fit_preference: pref }))}
                  className={`rounded-lg py-2.5 text-sm font-medium capitalize transition-all ${
                    form.fit_preference === pref
                      ? "bg-primary text-primary-foreground glow-purple"
                      : "glass hover:bg-surface-hover"
                  }`}
                >
                  {pref}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={saving} className="w-full glow-purple bg-primary hover:bg-primary/90 font-display h-11 gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Lock In My Fit</>}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Measurements;
