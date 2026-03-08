

## Stripe Account Migration — Code Update Plan

### What's Done

The Stripe account has been successfully switched from the old sandbox account (`acct_1SEwpx3EeswiMlDC`) to your correct account **Chravel, Inc** (`acct_1SEwpl47wCAQ57Mm` / christian@chravelapp.com).

All products and prices have been created on the new account:

| Product | Product ID | Monthly Price | Annual Price |
|---------|-----------|---------------|-------------|
| Explorer | `prod_U73VxEnvEHbBrx` | `price_1T8pOc47wCAQ57MmWsPX3Jku` | `price_1T8pOl47wCAQ57MmDT7uefS7` |
| Frequent Chraveler | `prod_U73VfiKf3VrJKf` | `price_1T8pOd47wCAQ57MmIrACPNpc` | `price_1T8pOl47wCAQ57MmrhqSZM2j` |
| Starter Pro | `prod_U73Vlcl4lqgsb4` | `price_1T8pOe47wCAQ57MmkShIK75i` | — |
| Growth Pro | `prod_U73VPX6TlClQ7J` | `price_1T8pOf47wCAQ57Mm5k8uVQrW` | — |
| Enterprise | `prod_U73Vd6QW4pEY9x` | `price_1T8pOg47wCAQ57MmcEPnjd3s` | — |
| Explorer Trip Pass (45d) | `prod_U73WaALe9yjrAR` | `price_1T8pP047wCAQ57Mm6sfNTg2w` | — |
| FC Trip Pass (90d) | `prod_U73W99ebeJvbLB` | `price_1T8pP047wCAQ57Mm2DOch99F` | — |

### What Needs Updating (Code Changes)

**File 1: `src/constants/stripe.ts`**

Replace all old product/price IDs with the new ones listed above:
- Explorer: product_id, monthly price_id, annual price_id
- Frequent Chraveler: product_id, monthly price_id, annual price_id  
- Starter Pro: product_id, price_id
- Growth Pro: product_id, price_id
- Enterprise: product_id, price_id

**File 2: `src/billing/config.ts`**

Replace all old Stripe product/price IDs:
- `consumer-explorer`: stripeProductId → `prod_U73VxEnvEHbBrx`, monthly → `price_1T8pOc47wCAQ57MmWsPX3Jku`, annual → `price_1T8pOl47wCAQ57MmDT7uefS7`
- `consumer-frequent-chraveler`: stripeProductId → `prod_U73VfiKf3VrJKf`, monthly → `price_1T8pOd47wCAQ57MmIrACPNpc`, annual → `price_1T8pOl47wCAQ57MmrhqSZM2j`
- Remove `consumer-plus` legacy entry (old account product, no longer valid)
- `pro-starter`: stripeProductId → `prod_U73Vlcl4lqgsb4`, monthly → `price_1T8pOe47wCAQ57MmkShIK75i`
- `pro-growth`: stripeProductId → `prod_U73VPX6TlClQ7J`, monthly → `price_1T8pOf47wCAQ57Mm5k8uVQrW`
- `pro-enterprise`: stripeProductId → `prod_U73Vd6QW4pEY9x`, monthly → `price_1T8pOg47wCAQ57MmcEPnjd3s`
- Trip Pass products: Explorer → `prod_U73WaALe9yjrAR`/`price_1T8pP047wCAQ57Mm6sfNTg2w`, FC → `prod_U73W99ebeJvbLB`/`price_1T8pP047wCAQ57Mm2DOch99F`

### Note on Build Errors

The existing build errors in the output are in `supabase/functions/gmail-import-worker/index.ts` and `supabase/functions/join-trip/index.ts` — these are pre-existing type issues unrelated to this Stripe migration. They will not be affected by these changes.

