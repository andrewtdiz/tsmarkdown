import React from 'react';

interface BlogLayoutProps {
  post: {
    title: string;
    author: {
      name: string;
      avatar: string;
      bio: string;
      twitter: string;
    };
    publishDate: Date;
    tags: string[];
    readingTime: number;
    featured?: boolean;
  };
  children: React.ReactNode;
}

export function BlogLayout({ post, children }: BlogLayoutProps) {
  return (
    <div className="blog-layout">
      <header className="blog-header">
        <nav className="blog-nav">
          <a href="/" className="logo">Better-MDX Blog</a>
          <div className="nav-links">
            <a href="/blog">All Posts</a>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
          </div>
        </nav>
      </header>

      <main className="blog-content">
        <article className="blog-post">
          {post.featured && (
            <div className="featured-badge">
              ⭐ Featured Post
            </div>
          )}

          <div className="post-content">
            {children}
          </div>

          <footer className="post-footer">
            <div className="post-meta">
              <p>Published on {post.publishDate.toLocaleDateString()}</p>
              <p>Reading time: {post.readingTime} minutes</p>
            </div>
          </footer>
        </article>

        <aside className="blog-sidebar">
          <div className="author-info">
            <img
              src={post.author.avatar}
              alt={post.author.name}
              className="author-avatar"
            />
            <h3>{post.author.name}</h3>
            <p>{post.author.bio}</p>
            <a
              href={`https://twitter.com/${post.author.twitter.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Follow on Twitter
            </a>
          </div>

          <div className="post-tags">
            <h4>Tags</h4>
            {post.tags.map(tag => (
              <a key={tag} href={`/tags/${tag}`} className="tag">
                {tag}
              </a>
            ))}
          </div>
        </aside>
      </main>

      <style jsx>{`
        .blog-layout {
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          line-height: 1.6;
        }

        .blog-header {
          background: white;
          border-bottom: 1px solid #e1e8ed;
          padding: 1rem 0;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .blog-nav {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          font-size: 1.5rem;
          font-weight: bold;
          color: #1a1a1a;
          text-decoration: none;
        }

        .nav-links {
          display: flex;
          gap: 2rem;
        }

        .nav-links a {
          color: #666;
          text-decoration: none;
          font-weight: 500;
        }

        .nav-links a:hover {
          color: #007bff;
        }

        .blog-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 3rem;
        }

        .blog-post {
          background: white;
          border-radius: 8px;
          padding: 3rem;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          position: relative;
        }

        .featured-badge {
          position: absolute;
          top: -10px;
          right: 20px;
          background: #007bff;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .post-content {
          color: #333;
        }

        .post-content h1 {
          color: #1a1a1a;
          margin-bottom: 1rem;
          font-size: 2.5rem;
          line-height: 1.2;
        }

        .post-content h2 {
          color: #1a1a1a;
          margin: 2rem 0 1rem;
          font-size: 1.8rem;
          border-bottom: 2px solid #e1e8ed;
          padding-bottom: 0.5rem;
        }

        .post-content h3 {
          color: #1a1a1a;
          margin: 1.5rem 0 0.5rem;
          font-size: 1.4rem;
        }

        .post-content p {
          margin-bottom: 1.5rem;
        }

        .post-content code {
          background: #f8f9fa;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 0.875em;
        }

        .post-content pre {
          background: #f8f9fa;
          border: 1px solid #e1e8ed;
          border-radius: 6px;
          padding: 1rem;
          overflow-x: auto;
          margin: 1.5rem 0;
        }

        .post-content blockquote {
          border-left: 4px solid #007bff;
          margin: 1.5rem 0;
          padding: 0 1.5rem;
          color: #666;
          font-style: italic;
        }

        .post-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
        }

        .post-content th,
        .post-content td {
          border: 1px solid #e1e8ed;
          padding: 0.75rem;
          text-align: left;
        }

        .post-content th {
          background: #f8f9fa;
          font-weight: 600;
        }

        .post-footer {
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid #e1e8ed;
        }

        .post-meta {
          color: #666;
          font-size: 0.875rem;
        }

        .blog-sidebar {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .author-info {
          background: white;
          border-radius: 8px;
          padding: 2rem;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          text-align: center;
        }

        .author-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          margin-bottom: 1rem;
        }

        .author-info h3 {
          margin: 0 0 0.5rem;
          color: #1a1a1a;
        }

        .author-info p {
          color: #666;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }

        .author-info a {
          color: #007bff;
          text-decoration: none;
          font-weight: 500;
        }

        .post-tags {
          background: white;
          border-radius: 8px;
          padding: 2rem;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .post-tags h4 {
          margin: 0 0 1rem;
          color: #1a1a1a;
        }

        .tag {
          display: inline-block;
          background: #e1f5fe;
          color: #0277bd;
          padding: 0.25rem 0.75rem;
          border-radius: 15px;
          text-decoration: none;
          font-size: 0.875rem;
          margin: 0.25rem 0.25rem 0.25rem 0;
        }

        .tag:hover {
          background: #b3e5fc;
        }

        @media (max-width: 768px) {
          .blog-content {
            grid-template-columns: 1fr;
            padding: 1rem;
          }

          .blog-post {
            padding: 2rem;
          }

          .post-content h1 {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
}