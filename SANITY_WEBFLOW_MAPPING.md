# Sanity ↔ Webflow Collection Mapping

## Main Collections

| Sanity Collection | Webflow Collection | Purpose | Example Items |
|-------------------|-------------------|---------|---------------|
| **category** | **Category** | Broad craft categories | Ceramics, Glass, Jewelry, Metalwork, Textiles, Woodwork, Basketry |
| **materialType** | **Material Type** | Groups of materials | Metals, Stones & Minerals, Glass & Crystal, Ceramics & Clay, etc. |
| **material** | **Material** | Specific materials | Gold, Silver, Bronze, Wood, Ceramic, Glass, Wool (80 items) |
| **finish** | **Finish** | Surface finishes | Polished, Matte, Glazed, Patinated, Brushed (32 items) |
| **medium** | **Medium Types** | Object types | Bowl, Vase, Ring, Necklace, Pendant, Bracelet (56 items) |
| **creator** | **Creator** | Artists/makers | 183 creators |
| **artwork** | **Artwork** | Individual artworks | 1377 artworks |
| **location** | **Location** | Studios, galleries | 212 locations |

## Important Notes

### Naming Notes
- ✅ Sanity "**category**" = Webflow "**Category**" (Ceramics, Glass, Jewelry) - MATCHING!
- ✅ Sanity "**medium**" = Webflow "**Medium Types**" (Bowl, Ring, Vase) - MUCH CLEARER NOW!

### Field References

#### On Artwork:
- `category` → references "Category" (craft category like Ceramics)
- `medium[]` → references "Medium Types" (object types like Bowl, Vase)
- `materials[]` → references "Material" (Gold, Silver, etc.)
- `finishes[]` → references "Finish" (Polished, Glazed, etc.)

#### On Creator:
- `category` → references "Category" (primary craft medium)
- `creatorMaterials[]` → references "Material" (aggregated from artworks)
- `creatorFinishes[]` → references "Finish" (aggregated from artworks)
- `creatorMediumTypes[]` → references "Medium Types" (aggregated from artworks)

## Artwork Fields Synced to Webflow

Based on `api/sync-to-webflow.js`, artworks sync these fields:
- `name` → Artwork name
- `workTitle` → Localized work title
- `description` → Localized description
- `creator` → References Creator collection
- **`category`** → References Category collection (craft medium like Ceramics, Glass)
- `materials[]` → References Material collection
- `medium[]` → References Medium Types collection (object types like Bowl, Vase)
- `finishes[]` → References Finish collection
- `size`, `year`, `price` → Text/number fields
- `mainImage`, `artwork-images` → Image fields

## Quick Reference

**Want to show craft categories?** → Use `category` field → Shows in Webflow "Category"
**Want to show object types?** → Use `medium` field → Shows in Webflow "Medium Types"
**Want to show materials?** → Use `materials` field → Shows in Webflow "Material"

