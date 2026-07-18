/* Dashboard feed — new-client updates + prospective-client questions asked from
   the counselor's public profile. The chatbox replies append to a thread (echo
   for now; real messaging later). */

export type FeedKind = "new_client" | "question"
export type FeedMessage = { from: "them" | "me"; text: string }

export interface FeedItem {
  id: string
  kind: FeedKind
  who: string
  initials: string
  topic: string
  text: string
  time: string
  thread?: FeedMessage[]
}

// Empty until real new-client / prospective-question events arrive. No fabricated people.
export const feedItems: FeedItem[] = []
