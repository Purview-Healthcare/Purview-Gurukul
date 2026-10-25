/* Purview Gurukul — Specialties tab: the registry.
   A specialty track teaches the basics a biller needs to work claims in one specialty
   (vision care first): what happens at the visit, the codes on the claim, which plan
   pays, and the denials that come up most. It is not a clinical course.
   Each specialty lives in its own file (spec-vision.js, ...) loaded after this one; it
   pushes one track into SPEC_TRACKS and its questions into SPEC_QUIZ. A track uses the
   same module → lesson shape as the course and the client playbooks. */
"use strict";
const SPEC_TRACKS=[];
const SPEC_QUIZ=[];
