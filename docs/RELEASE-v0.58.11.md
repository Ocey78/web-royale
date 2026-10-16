# Web Royale 0.58.11 — Coordinated Hero Mega Minion Horde

Hero Mega Minion Horde now has one shared ability control in Ultimate matches and Sandbox. Activating it spends 2 elixir once and activates every surviving member of that deployment together, consuming their ability charges together.

The Horde chooses one ordered list of eligible enemies. Each minion receives the next target, wrapping to the first when the list runs out: with two enemies, six minions target A, B, A, B, A, B. Targets remain assigned during the ability attack. Separate Horde deployments operate independently, and controls show each group's surviving member count.

Existing target eligibility, ability readiness, freeze interruptions and target-death behavior remain in effect. The updated form description also updates replay content compatibility for the changed Ultimate behavior.

No tests, simulations or gameplay/browser checks were run at the user's request. Build and publication records are under docs/qa/v05811/.
