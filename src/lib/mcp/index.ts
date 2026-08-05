import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listClosetItems from "./tools/list-closet-items";
import addClosetItem from "./tools/add-closet-item";
import listOutfits from "./tools/list-outfits";
import createOutfit from "./tools/create-outfit";
import getMeasurements from "./tools/get-measurements";
import listTryOns from "./tools/list-try-ons";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "ai-style-lab",
  title: "AI Style Lab",
  version: "0.1.0",
  instructions:
    "Tools for OUTFYT / AI Style Lab, a virtual try-on and outfit styling app. Read the signed-in user's virtual closet, outfits, body measurements, and saved try-on images; add items to the closet; and compose outfits from closet items. All data is scoped to the authenticated user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listClosetItems, addClosetItem, listOutfits, createOutfit, getMeasurements, listTryOns],
});
