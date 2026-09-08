import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import dayjs from "dayjs";
import { getFirebaseDb } from "@/lib/firebase";

export type CommunityMetric =
  | "weight"
  | "bp"
  | "water"
  | "calories"
  | "sodium"
  | "food"
  | "habits";

export type CommunityFilter = "all" | "post" | CommunityMetric;

export type CommunityPost = {
  id: string;
  authorUid: string;
  authorName: string;
  metric: "post" | CommunityMetric;
  text: string | null;
  activityLabel: string | null;
  createdAt: number;
  likedBy: string[];
  commentCount: number;
};

export type CommunityComment = {
  id: string;
  authorUid: string;
  authorName: string;
  text: string;
  createdAt: number;
};

export type CommunityPrefs = Record<CommunityMetric, boolean>;

export const COMMUNITY_METRICS: CommunityMetric[] = [
  "weight",
  "bp",
  "water",
  "calories",
  "sodium",
  "food",
  "habits",
];

export const EMPTY_PREFS: CommunityPrefs = {
  weight: false,
  bp: false,
  water: false,
  calories: false,
  sodium: false,
  food: false,
  habits: false,
};

function communityCollection() {
  return collection(getFirebaseDb(), "community");
}

function postRef(id: string) {
  return doc(communityCollection(), id);
}

function commentsCollection(postId: string) {
  return collection(postRef(postId), "comments");
}

function prefsRef(uid: string) {
  return doc(getFirebaseDb(), "users", uid, "community", "prefs");
}

export function communityAuthorName(name: string | null): string {
  return name?.trim() ? name.trim() : "Someone";
}

export function formatPostTime(createdAt: number): string {
  const secs = Math.round((Date.now() - createdAt) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86_400) return `${Math.floor(secs / 3600)}h`;
  return dayjs(createdAt).format("MMM D");
}

function mapPost(id: string, data: Record<string, unknown>): CommunityPost {
  return {
    id,
    authorUid: typeof data.authorUid === "string" ? data.authorUid : "",
    authorName:
      typeof data.authorName === "string" && data.authorName
        ? data.authorName
        : "Someone",
    metric: (typeof data.metric === "string"
      ? data.metric
      : "post") as CommunityPost["metric"],
    text: typeof data.text === "string" ? data.text : null,
    activityLabel:
      typeof data.activityLabel === "string" ? data.activityLabel : null,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
    likedBy: Array.isArray(data.likedBy)
      ? data.likedBy.filter((v): v is string => typeof v === "string")
      : [],
    commentCount:
      typeof data.commentCount === "number" ? data.commentCount : 0,
  };
}

function mapComment(id: string, data: Record<string, unknown>): CommunityComment {
  return {
    id,
    authorUid: typeof data.authorUid === "string" ? data.authorUid : "",
    authorName:
      typeof data.authorName === "string" && data.authorName
        ? data.authorName
        : "Someone",
    text: typeof data.text === "string" ? data.text : "",
    createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
  };
}

function feedConstraints(filter: CommunityFilter, max: number): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];
  if (filter !== "all") constraints.push(where("metric", "==", filter));
  constraints.push(orderBy("createdAt", "desc"), limit(max));
  return constraints;
}

export function watchCommunity(
  onChange: (posts: CommunityPost[]) => void,
  onError: (error: Error) => void,
  filter: CommunityFilter = "all",
  max = 50,
) {
  const recent = query(communityCollection(), ...feedConstraints(filter, max));
  return onSnapshot(
    recent,
    (snapshot) => onChange(snapshot.docs.map((d) => mapPost(d.id, d.data()))),
    onError,
  );
}

export async function loadMoreCommunity(
  filter: CommunityFilter,
  beforeCreatedAt: number,
  max = 50,
): Promise<CommunityPost[]> {
  const older = query(
    communityCollection(),
    ...(filter === "all" ? [] : [where("metric", "==", filter)]),
    orderBy("createdAt", "desc"),
    startAfter(beforeCreatedAt),
    limit(max),
  );
  const snapshot = await getDocs(older);
  return snapshot.docs.map((d) => mapPost(d.id, d.data()));
}

export async function addCommunityPost(
  uid: string,
  authorName: string,
  text: string,
) {
  await addDoc(communityCollection(), {
    authorUid: uid,
    authorName,
    metric: "post",
    text: text.trim(),
    activityLabel: null,
    createdAt: Date.now(),
    likedBy: [],
    commentCount: 0,
  });
}

export async function addCommunityActivity(
  uid: string,
  authorName: string,
  metric: CommunityMetric,
  label: string,
) {
  await addDoc(communityCollection(), {
    authorUid: uid,
    authorName,
    metric,
    text: null,
    activityLabel: label,
    createdAt: Date.now(),
    likedBy: [],
    commentCount: 0,
  });
}

export async function deleteCommunityPost(id: string) {
  await deleteDoc(postRef(id));
}

export async function toggleLike(postId: string, uid: string, liked: boolean) {
  await updateDoc(postRef(postId), {
    likedBy: liked ? arrayRemove(uid) : arrayUnion(uid),
  });
}

export function watchComments(
  postId: string,
  onChange: (comments: CommunityComment[]) => void,
  onError: (error: Error) => void,
) {
  const ordered = query(
    commentsCollection(postId),
    orderBy("createdAt", "asc"),
  );
  return onSnapshot(
    ordered,
    (snapshot) =>
      onChange(snapshot.docs.map((d) => mapComment(d.id, d.data()))),
    onError,
  );
}

export async function addComment(
  postId: string,
  uid: string,
  authorName: string,
  text: string,
) {
  await addDoc(commentsCollection(postId), {
    authorUid: uid,
    authorName,
    text: text.trim(),
    createdAt: Date.now(),
  });
  updateDoc(postRef(postId), { commentCount: increment(1) }).catch(() => {});
}

export async function deleteComment(postId: string, id: string) {
  await deleteDoc(doc(commentsCollection(postId), id));
  updateDoc(postRef(postId), { commentCount: increment(-1) }).catch(() => {});
}

export function watchCommunityPrefs(
  uid: string,
  onChange: (prefs: CommunityPrefs) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    prefsRef(uid),
    (snapshot) => {
      const data = snapshot.data() ?? {};
      const next = { ...EMPTY_PREFS };
      for (const key of COMMUNITY_METRICS) next[key] = data[key] === true;
      onChange(next);
    },
    onError,
  );
}

export async function saveCommunityPrefs(
  uid: string,
  patch: Partial<CommunityPrefs>,
) {
  await setDoc(
    prefsRef(uid),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/** Fire-and-forget; no-op unless the user enabled sharing for this metric. */
export function postActivityIfShared(
  uid: string,
  prefs: CommunityPrefs | undefined,
  name: string | null,
  metric: CommunityMetric,
  label: string,
) {
  if (!prefs?.[metric]) return;
  addCommunityActivity(uid, communityAuthorName(name), metric, label).catch(
    () => {},
  );
}
