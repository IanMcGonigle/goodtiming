# Domain types

Add shared listing types here when the first listing feature is implemented. Keep them independent of React and MongoDB driver types.

The expected listing includes an eBay item ID, title, brand/model/reference, money with explicit currency, seller, images, affiliate URL, discovery timestamp, score, workflow status, and editorial evaluation (summary, reason, category).

Expected workflow: DISCOVERED → FILTERED → SCORED → AI_REVIEWED → PROPOSED → APPROVED → PUBLISHED, with SOLD and EXPIRED lifecycle states. Human approval is mandatory before publication. Editorial categories may include Today's Find, Under $500, Vintage, Icons, Oddities, and Best Value.

These are planning notes, not a finalized schema or implemented state machine.
