import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Post } from "@/pages/HomePage";
import { Crown } from "lucide-react";

interface WeeklyBestPostsProps {
  posts: Post[];
}

const WeeklyBestPosts = ({ posts }: WeeklyBestPostsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Crown className="text-yellow-500" />
            주간 베스트 글
        </CardTitle>
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 베스트 글이 없습니다.</p>
        ) : (
          <ol className="space-y-3">
            {posts.map((post, index) => (
              <li key={post.id} className="flex items-start gap-3">
                <span className="text-lg font-bold w-5 text-center">{index + 1}</span>
                <Link to={`/post/${post.id}`} className="hover:underline flex-1 truncate">
                  {post.title}
                </Link>
                <span className="text-sm text-muted-foreground">❤️ {post.likeCount || 0}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklyBestPosts; 