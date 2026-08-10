# Helpdesk knowledge base

A working app. The frontend is all you have: `src/` is a static bundle served in front of a
separate Go service you cannot see, edit or redeploy. The API contract below is the only thing
you know about it, and it is not going to change for you.

## The API you have to work with

`src/api.ts` sends the session cookie the internal proxy already sets. Every call assumes that
cookie is present, and the Go service verifies it. Nothing in this repository issues it.
