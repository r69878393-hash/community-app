"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { t } from "@/lib/strings";

type Community = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
};

type Profile = { username: string };

type Post = {
  id: number;
  content: string;
  created_at: string;
  user_id: string | null;
  type: string;
  image_path: string | null;
  video_path: string | null;
  profiles: Profile[] | Profile | null;
};

const MAX_IMAGE_MB = 5;
const MAX_VIDEO_MB = 20;
const MAX_VIDEO_SECONDS = 60;
const VIDEO_TYPES = ["video/mp4", "video/webm"];

const getUsername = (post: Post) => {
  const p = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
  return p?.username ?? t.legacyPost;
};

const getPublicUrl = (bucket: string, path: string) =>
  supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

const getVideoDuration = (file: File) =>
  new Promise<number>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable"));
    };
    video.src = url;
  });

export default function CommunityView() {
  const { slug } = useParams<{ slug: string }>();
  const [community, setCommunity] = useState<Community | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<number | null>(null);
  const [reportedIds, setReportedIds] = useState<number[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadPosts = async (communityId: number) => {
    const { data, error } = await supabase
      .from("posts")
      .select(
        "id, content, created_at, user_id, type, image_path, video_path, profiles(username)"
      )
      .eq("community_id", communityId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    setPosts((data ?? []) as Post[]);
  };

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("communities")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) {
        console.error(error);
        return;
      }
      if (!data) {
        setNotFound(true);
        return;
      }
      setCommunity(data);
      loadPosts(data.id);
    };
    load();
  }, [slug]);

  const rejectFile = (message: string) => {
    setError(message);
    setFile(null);
    setFileKey((k) => k + 1);
  };

  const handleFileChange = async (f: File | null) => {
    setError("");
    if (!f) {
      setFile(null);
      return;
    }

    if (f.type.startsWith("image/")) {
      if (f.size > MAX_IMAGE_MB * 1024 * 1024) {
        rejectFile(t.imageTooBig(MAX_IMAGE_MB));
        return;
      }
      setFile(f);
      return;
    }

    if (VIDEO_TYPES.includes(f.type)) {
      if (f.size > MAX_VIDEO_MB * 1024 * 1024) {
        rejectFile(t.videoTooBig(MAX_VIDEO_MB));
        return;
      }
      try {
        const duration = await getVideoDuration(f);
        if (duration > MAX_VIDEO_SECONDS) {
          rejectFile(t.videoTooLong(MAX_VIDEO_SECONDS));
          return;
        }
      } catch {
        rejectFile(t.videoUnreadable);
        return;
      }
      setFile(f);
      return;
    }

    rejectFile(t.unsupportedFile);
  };

  const handlePost = async () => {
    if (!community || !userId || posting) return;
    if (text.trim() === "" && !file) return;
    setPosting(true);
    setError("");

    const isVideo = !!file && file.type.startsWith("video/");
    const bucket = isVideo ? "post-videos" : "post-images";

    let mediaPath: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      mediaPath = `${userId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(mediaPath, file);
      if (uploadError) {
        console.error(uploadError);
        setError(t.uploadFailed + uploadError.message);
        setPosting(false);
        return;
      }
    }

    const { error: insertError } = await supabase.from("posts").insert({
      content: text,
      community_id: community.id,
      type: mediaPath ? (isVideo ? "video" : "image") : "text",
      image_path: mediaPath && !isVideo ? mediaPath : null,
      video_path: mediaPath && isVideo ? mediaPath : null,
    });
    if (insertError) {
      console.error(insertError);
      setError(t.postFailed + insertError.message);
      if (mediaPath) {
        await supabase.storage.from(bucket).remove([mediaPath]);
      }
      setPosting(false);
      return;
    }

    setText("");
    setFile(null);
    setFileKey((k) => k + 1);
    setPosting(false);
    loadPosts(community.id);
  };

  const handleDelete = async (post: Post) => {
    if (!community) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) {
      console.error(error);
      return;
    }
    if (post.image_path) {
      await supabase.storage.from("post-images").remove([post.image_path]);
    }
    if (post.video_path) {
      await supabase.storage.from("post-videos").remove([post.video_path]);
    }
    loadPosts(community.id);
  };
  const handleReport = async (postId: number, reason: string) => {
    const { error } = await supabase
      .from("reports")
      .insert({ post_id: postId, reason });
    // 23505 = すでに通報済み。画面上は「通報済み」にしてよい
    if (error && error.code !== "23505") {
      console.error(error);
      setError(t.reportFailed + error.message);
      return;
    }
    setReportedIds((ids) => [...ids, postId]);
    setReportingId(null);
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (notFound) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <p>{t.notFound}</p>
        <Link href="/" className="underline">
          {t.backToList}
        </Link>
      </main>
    );
  }

  if (!community) {
    return <main className="mx-auto max-w-xl p-8">{t.loading}</main>;
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <div className="flex justify-between text-sm">
        <Link href="/" className="underline">
          {t.backToList}
        </Link>
        {userId ? (
          <button className="underline" onClick={handleLogout}>
            {t.logout}
          </button>
        ) : (
          <Link href="/login" className="underline">
            {t.login}
          </Link>
        )}
      </div>

      <h1 className="text-3xl font-bold mt-2 mb-2">{community.name}</h1>
      <p className="mb-6">{community.description}</p>

      {userId ? (
        <>
          <textarea
            className="w-full rounded border p-2 bg-black text-white"
            rows={3}
            placeholder={t.postPlaceholder(community.name)}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <input
            key={fileKey}
            type="file"
            accept="image/*,video/mp4,video/webm"
            className="mt-2 block text-sm"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-xs opacity-60">
            {t.fileHint(MAX_IMAGE_MB, MAX_VIDEO_MB, MAX_VIDEO_SECONDS)}
          </p>
          <button
            className="mt-2 rounded bg-white px-4 py-2 text-black disabled:opacity-50"
            onClick={handlePost}
            disabled={posting}
          >
            {posting ? t.posting : t.post}
          </button>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </>
      ) : (
        <p className="rounded border p-3 text-sm">
          {t.logInToPost}{" "}
          <Link href="/login" className="underline">
            {t.login.toLowerCase()}
          </Link>
          {t.logInToPostEnd}
        </p>
      )}

      <ul className="mt-6 space-y-3">
        {posts.map((post) => (
          <li key={post.id} className="rounded border p-3">
            <div className="mb-1 text-sm opacity-70">
              {getUsername(post)} ・{" "}
              {new Date(post.created_at).toLocaleString(t.locale)}
            </div>
            {post.content && <div>{post.content}</div>}
            {post.image_path && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getPublicUrl("post-images", post.image_path)}
                alt=""
                className="mt-2 max-h-96 rounded"
              />
            )}
            {post.video_path && (
              <video
                src={getPublicUrl("post-videos", post.video_path)}
                controls
                playsInline
                preload="metadata"
                className="mt-2 max-h-96 rounded"
              />
            )}
            {userId && post.user_id === userId && (
              <button
                className="mt-2 block text-sm underline opacity-70"
                onClick={() => handleDelete(post)}
              >
                {t.delete}
              </button>
            )}
                        {userId && post.user_id !== userId && (
              <div className="mt-2 text-sm">
                {reportedIds.includes(post.id) ? (
                  <span className="opacity-70">{t.reported}</span>
                ) : reportingId === post.id ? (
                  <div className="rounded border p-2">
                    <p className="mb-2">{t.reportTitle}</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ["spam", t.reportSpam],
                        ["abuse", t.reportAbuse],
                        ["copyright", t.reportCopyright],
                        ["other", t.reportOther],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          className="rounded border px-2 py-1"
                          onClick={() => handleReport(post.id, value)}
                        >
                          {label}
                        </button>
                      ))}
                      <button
                        className="underline opacity-70"
                        onClick={() => setReportingId(null)}
                      >
                        {t.reportCancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="underline opacity-70"
                    onClick={() => setReportingId(post.id)}
                  >
                    {t.report}
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
            <footer className="mt-10 text-xs opacity-60">
        <Link href="/terms" className="underline">
          {t.terms}
        </Link>
      </footer>
    </main>
  );
}