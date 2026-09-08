"use client";

import { useEffect, useState } from "react";
import {
  App,
  Button,
  Card,
  Empty,
  Flex,
  Grid,
  Input,
  Segmented,
  Spin,
  theme,
  Typography,
} from "antd";
import {
  HeartFilled,
  HeartOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/components/auth-provider";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Icon, type IconName } from "@/components/icon";
import { useUnitsContext } from "@/components/units-provider";
import {
  addComment,
  addCommunityPost,
  communityAuthorName,
  deleteComment,
  deleteCommunityPost,
  formatPostTime,
  loadMoreCommunity,
  toggleLike,
  watchCommunity,
  watchComments,
  type CommunityComment,
  type CommunityFilter,
  type CommunityPost,
} from "@/models/community";

const PAGE = 50;

const FILTER_OPTIONS: { label: string; value: CommunityFilter }[] = [
  { label: "All", value: "all" },
  { label: "Posts", value: "post" },
  { label: "Weight", value: "weight" },
  { label: "Water", value: "water" },
  { label: "BP", value: "bp" },
  { label: "Calories", value: "calories" },
  { label: "Sodium", value: "sodium" },
  { label: "Food", value: "food" },
  { label: "Habits", value: "habits" },
];

function CommentThread({
  postId,
  uid,
  authorName,
}: {
  postId: string;
  uid: string;
  authorName: string;
}) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    return watchComments(
      postId,
      (next) => {
        setComments(next);
        setLoaded(true);
      },
      () => setLoaded(true),
    );
  }, [postId]);

  function send() {
    if (!text.trim()) return;
    addComment(postId, uid, authorName, text).catch(() =>
      message.error("Could not comment."),
    );
    setText("");
  }

  return (
    <Flex
      vertical
      gap={10}
      style={{
        marginTop: 12,
        paddingLeft: 12,
        borderLeft: `2px solid ${token.colorBorderSecondary}`,
      }}
    >
      {!loaded ? (
        <Spin size="small" />
      ) : (
        comments.map((comment) => (
          <Flex key={comment.id} align="flex-start" justify="space-between" gap={8}>
            <Flex vertical style={{ minWidth: 0 }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                <Typography.Text strong style={{ fontSize: 12 }}>
                  {comment.authorName}
                </Typography.Text>{" "}
                · {formatPostTime(comment.createdAt)}
              </Typography.Text>
              <Typography.Text style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>
                {comment.text}
              </Typography.Text>
            </Flex>
            {comment.authorUid === uid ? (
              <ConfirmDeleteButton
                ariaLabel="Delete comment"
                onConfirm={() =>
                  deleteComment(postId, comment.id).catch(() =>
                    message.error("Could not delete comment."),
                  )
                }
              />
            ) : null}
          </Flex>
        ))
      )}
      <Flex gap={8}>
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Write a comment…"
          maxLength={1000}
          onPressEnter={send}
        />
        <Button
          type="primary"
          disabled={!text.trim()}
          onClick={send}
        >
          Send
        </Button>
      </Flex>
    </Flex>
  );
}

export function CommunityFeed() {
  const { user } = useAuth();
  const { profile } = useUnitsContext();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const enterToSend = screens.md === true;
  const name = communityAuthorName(profile.name);

  const [filter, setFilter] = useState<CommunityFilter>("all");
  const [feed, setFeed] = useState<{
    filter: CommunityFilter;
    items: CommunityPost[];
    ready: boolean;
  }>({ filter: "all", items: [], ready: false });
  const [text, setText] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    return watchCommunity(
      (items) => setFeed({ filter, items, ready: true }),
      () => {
        message.error("Could not load the community feed.");
        setFeed((current) => ({ ...current, filter, ready: true }));
      },
      filter,
    );
  }, [user, filter, message]);

  const posts = feed.filter === filter ? feed.items : [];
  const loaded = feed.filter === filter && feed.ready;

  function changeFilter(next: CommunityFilter) {
    setFilter(next);
    setReachedEnd(false);
  }

  function handlePost() {
    if (!user || !text.trim()) return;
    addCommunityPost(user.uid, name, text).catch(() =>
      message.error("Could not post. Try again."),
    );
    message.success(navigator.onLine ? "Posted" : "Saved offline · will sync");
    setText("");
  }

  async function handleLoadMore() {
    if (loadingMore || posts.length === 0) return;
    setLoadingMore(true);
    try {
      const older = await loadMoreCommunity(
        filter,
        posts[posts.length - 1].createdAt,
        PAGE,
      );
      if (older.length === 0) {
        setReachedEnd(true);
        return;
      }
      setFeed((current) => {
        if (current.filter !== filter) return current;
        const seen = new Set(current.items.map((post) => post.id));
        return {
          ...current,
          items: [
            ...current.items,
            ...older.filter((post) => !seen.has(post.id)),
          ],
        };
      });
    } catch {
      message.error("Could not load older posts.");
    } finally {
      setLoadingMore(false);
    }
  }

  function toggleComments(postId: string) {
    setOpenComments((current) => {
      const next = new Set(current);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 4 }}>
        <Icon name="community" />
        Community
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 20 }}>
        One shared feed for the group. Posts show your Profile name (or
        &ldquo;Someone&rdquo; if it&rsquo;s blank).
      </Typography.Paragraph>

      <Flex vertical gap={8} style={{ marginBottom: 20 }}>
        <Input.TextArea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="What's on your mind?"
          autoSize={{ minRows: 2, maxRows: 8 }}
          maxLength={2000}
          onKeyDown={
            enterToSend
              ? (event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handlePost();
                  }
                }
              : undefined
          }
        />
        <Flex justify="flex-end">
          <Button type="primary" disabled={!text.trim()} onClick={handlePost}>
            Post
          </Button>
        </Flex>
      </Flex>

      <div style={{ overflowX: "auto", marginBottom: 16 }}>
        <Segmented
          options={FILTER_OPTIONS}
          value={filter}
          onChange={(value) => changeFilter(value as CommunityFilter)}
        />
      </div>

      {!loaded ? (
        <Flex justify="center" style={{ padding: 24 }}>
          <Spin />
        </Flex>
      ) : posts.length === 0 ? (
        <Empty
          description={
            filter === "all"
              ? "No posts yet. Say hi."
              : "Nothing here for this filter yet."
          }
        />
      ) : (
        <Flex vertical gap={12}>
          {posts.map((post) => {
            const liked = post.likedBy.includes(user?.uid ?? "");
            return (
              <Card key={post.id} size="small">
                <Flex align="flex-start" justify="space-between" gap={12}>
                  <Flex vertical gap={4} style={{ minWidth: 0 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      <Typography.Text strong style={{ fontSize: 13 }}>
                        {post.authorName}
                      </Typography.Text>{" "}
                      · {formatPostTime(post.createdAt)}
                    </Typography.Text>
                    {post.metric === "post" ? (
                      <Typography.Text style={{ whiteSpace: "pre-wrap" }}>
                        {post.text}
                      </Typography.Text>
                    ) : (
                      <Typography.Text type="secondary">
                        <Icon
                          name={post.metric as IconName}
                          style={{ marginRight: 6 }}
                        />
                        {post.activityLabel}
                      </Typography.Text>
                    )}
                  </Flex>
                  {post.authorUid === user?.uid ? (
                    <ConfirmDeleteButton
                      ariaLabel="Delete post"
                      onConfirm={() =>
                        deleteCommunityPost(post.id).catch(() =>
                          message.error("Could not delete post."),
                        )
                      }
                    />
                  ) : null}
                </Flex>

                <Flex gap={4} style={{ marginTop: 8 }}>
                  <Button
                    type="text"
                    size="small"
                    icon={
                      liked ? (
                        <HeartFilled style={{ color: token.colorError }} />
                      ) : (
                        <HeartOutlined />
                      )
                    }
                    onClick={() => {
                      if (user) {
                        toggleLike(post.id, user.uid, liked).catch(() => {});
                      }
                    }}
                  >
                    {post.likedBy.length || ""}
                  </Button>
                  <Button
                    type="text"
                    size="small"
                    icon={<MessageOutlined />}
                    onClick={() => toggleComments(post.id)}
                  >
                    {post.commentCount || ""}
                  </Button>
                </Flex>

                {openComments.has(post.id) && user ? (
                  <CommentThread
                    postId={post.id}
                    uid={user.uid}
                    authorName={name}
                  />
                ) : null}
              </Card>
            );
          })}

          {posts.length >= PAGE && !reachedEnd ? (
            <Flex justify="center" style={{ marginTop: 8 }}>
              <Button loading={loadingMore} onClick={handleLoadMore}>
                Load more
              </Button>
            </Flex>
          ) : null}
        </Flex>
      )}
    </div>
  );
}
