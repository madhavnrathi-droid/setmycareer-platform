// Per-item vocabulary clarifications — the ⓘ Clarification layer of the test
// room. Keyed by the item's EXACT text so the validated instrument arrays in
// src/lib/sigma stay byte-identical. Authored against IPIP/administration
// conventions and adversarially reviewed: entries that steered answers, softened
// keyed constructs, added response instructions or invented quantitative anchors
// were rejected. Rules: vocabulary, scope, situations and neutral examples ONLY;
// max ~3 short lines; equally neutral for positively- and negatively-keyed items.
// Aptitude items never get generated clarifications (hint risk).
//
// 2026-07-21: pruned 13 entries that were keyed to the RETIRED legacy inventory
// (interest-items.ts) and so never matched a live item; re-keyed the one entry
// whose hard term ('investments') survives in the reworded final inventory.
// The 12-16 rewording pass removed most hard vocabulary at the source, which is
// why the interest side needs almost no clarifications now.

export const CLARIFICATIONS: Record<string, string> = {
  "I keep to myself unless someone approaches me first.":
    "'Keep to myself' means not starting conversations or joining in on your own. Count any setting — class, work, family gatherings, online groups.",
  "I am comfortable taking the lead when a group needs direction.":
    "'Taking the lead' means becoming the one who decides what the group does next. 'Needs direction' means nobody is sure what to do. Any group counts — class, sport, friends.",
  "I avoid positions where I have to direct others.":
    "'Direct others' means telling people what to do and checking it gets done — captain, monitor, team lead, organiser. 'Positions' means any such role, formal or informal.",
  "I can persuade people to get behind a plan.":
    "'Get behind' is an idiom meaning genuinely support. The item asks whether you can talk people into backing an idea — in projects, friend groups or family decisions.",
  "I prefer sharing credit rather than competing for it.":
    "'Credit' here means recognition or praise for work — not marks or course credits. Sharing means the whole group is named; competing means wanting it mainly for yourself.",
  "I prevent others from taking unfair credit for my work.":
    "'Taking credit' means being praised for work someone else did. The item asks whether you speak up or act when that happens to your work, in any setting.",
  "I listen calmly when I receive tough feedback.":
    "'Tough feedback' means direct criticism of your work or behaviour — from teachers, parents, coaches or peers. 'Calmly' refers to the moment you are hearing it.",
  "I can separate feedback about my work from my self-worth.":
    "'Self-worth' means your overall sense of your value as a person. The item asks whether criticism of one piece of work stays limited to that work in your mind.",
  "I react strongly when someone points out my mistakes.":
    "'React strongly' covers any big immediate response — arguing back, going quiet, feeling hurt or defensive. Count reactions inside you as well as ones people can see.",
  "I am slow to anger, even when things go wrong.":
    "'Slow to anger' is an idiom: it takes a lot to make you angry. It says nothing about speed of thinking. 'Things go wrong' means setbacks of any size.",
  "I take ownership for results, whether good or bad.":
    "'Take ownership' means openly treating a result as yours — 'that was my doing' — whether it turned out well or badly. Applies to school, work or personal projects.",
  "Public image matters more to me than my own standards.":
    "'Public image' is how you look to others; 'own standards' are your private rules for yourself. The item asks which one wins when the two pull in different directions.",
  "I value authenticity over social approval.":
    "'Authenticity' means acting as you really are; 'social approval' means others liking or accepting what you do. The item asks which you choose when you cannot have both.",
  "I look for protective people who can take care of me.":
    "'Protective people' means people who look out for you and step in when things get hard — family, mentors, senior friends. 'Take care of' covers practical and emotional support.",
  "I can cope with challenges without much external support.":
    "'Cope' means manage or get through. 'External support' means help from other people — advice, comfort or practical assistance. Challenges include studies, work and personal difficulties.",
  "I rarely attend cultural or social events.":
    "'Cultural or social events' means organised gatherings — festivals, weddings, performances, school or community functions, religious events. Attending includes going along with family, not only choosing to go yourself.",
  "I respond impulsively rather than pausing to reflect.":
    "'Impulsively' means acting on your first urge, without stopping to think. 'Pausing to reflect' means taking even a short moment to consider before acting or replying.",
  "I approach problems in a systematic way.":
    "'Systematic' means following a set order or method — step by step, using a routine or process — rather than handling each problem differently as it comes.",
  "People rely on me for jobs that require patience.":
    "'Jobs' here means tasks of any kind — not paid employment. Think of slow, repetitive or fiddly tasks that others hand to you at home, school or work.",
  "I enjoy learning how money, savings, banks, and investments work.":
    "Investments means putting money into things like shares, mutual funds, gold or property in the hope it grows. You do not need to have invested to answer.",
}

export const clarifyFor = (text: string): string | undefined => CLARIFICATIONS[text]
