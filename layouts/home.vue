<template>
  <YunLayoutWrapper>
    <main class="home-page">
    <header class="intro-card">
      <img class="avatar" src="/images/author-avatar.webp" alt="Guraぐら的头像">
      <p class="eyebrow">GURA'S MAD NOTES</p>
      <h1>my-notes</h1>
      <p class="intro-copy">
        记录 MAD《夜もすがら君恋ふ》的分镜、技术尝试与制作想法，也为之后的作品留一页空白。
      </p>
      <nav class="home-links" aria-label="博客导航">
        <RouterLink class="button button-primary" to="/posts/yomosugara-storybrew">阅读制作记录</RouterLink>
        <RouterLink class="button" to="/archives/">浏览归档</RouterLink>
        <RouterLink class="button" to="/about/">关于本站</RouterLink>
      </nav>
    </header>

    <section class="latest-section" aria-labelledby="latest-heading">
      <div class="section-heading">
        <p class="eyebrow">IN PROGRESS</p>
        <h2 id="latest-heading">最近的制作记录</h2>
      </div>
      <article class="featured-card">
        <RouterLink class="cover-link" to="/posts/yomosugara-storybrew" aria-label="阅读《夜もすがら君恋ふ》制作记录">
          <img src="/images/storyboards/title-04.webp" alt="《夜もすがら君恋ふ》MAD 分镜与视觉设计">
        </RouterLink>
        <div class="featured-copy">
          <p class="post-meta">MAD 制作 · Storybrew · 草稿</p>
          <h3><RouterLink to="/posts/yomosugara-storybrew">夜もすがら君恋ふ</RouterLink></h3>
          <p>从节拍、歌词与角色画面出发，整理分镜结构、实现方式和参考作品。这里会继续补充实际制作过程与个人复盘。</p>
          <RouterLink class="read-link" to="/posts/yomosugara-storybrew">打开制作记录 <span aria-hidden="true">→</span></RouterLink>
        </div>
      </article>
    </section>

    <footer class="home-footer">
      <span>MAD / STORYBOARD / STORYBREW</span>
      <RouterLink to="/posts/">查看全部文章 <span aria-hidden="true">→</span></RouterLink>
    </footer>
    </main>
  </YunLayoutWrapper>
</template>

<style scoped>
.home-page {
  width: min(100%, 58rem);
  margin: 0 auto;
  padding: clamp(1.5rem, 5vw, 4rem) clamp(1rem, 4vw, 2rem) 2rem;
  color: var(--mad-ink);
}

.intro-card {
  padding: clamp(1.5rem, 5vw, 3rem);
  border: 1px solid var(--mad-line);
  border-radius: 1rem;
  background: var(--mad-card);
  text-align: center;
}

.avatar {
  display: block;
  width: 6rem;
  height: 6rem;
  margin: 0 auto 1.2rem;
  border: 2px solid var(--mad-line);
  border-radius: 50%;
  object-fit: cover;
}

.eyebrow {
  margin: 0 0 0.6rem;
  color: var(--mad-accent);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 0.75rem;
  font-size: clamp(1.8rem, 6vw, 2.8rem);
  letter-spacing: 0.025em;
}

.intro-copy {
  max-width: 38rem;
  margin: 0 auto;
  color: var(--mad-muted);
  line-height: 1.9;
}

.home-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.65rem;
  margin-top: 1.5rem;
}

.button {
  display: inline-flex;
  min-height: 2.65rem;
  align-items: center;
  justify-content: center;
  padding: 0.55rem 0.9rem;
  border: 1px solid var(--mad-line);
  border-radius: 0.65rem;
  color: var(--mad-ink);
  background: var(--mad-button);
  font-size: 0.9rem;
  text-decoration: none;
}

.button-primary {
  border-color: var(--mad-accent);
  color: #fff;
  background: var(--mad-accent);
}

.latest-section {
  margin-top: clamp(2.5rem, 7vw, 4rem);
}

.section-heading {
  margin-bottom: 1rem;
}

.section-heading h2 {
  margin: 0;
  font-size: 1.3rem;
}

.featured-card {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  overflow: hidden;
  border: 1px solid var(--mad-line);
  border-radius: 1rem;
  background: var(--mad-card);
}

.cover-link {
  display: block;
  min-height: 14rem;
  overflow: hidden;
  background: var(--mad-card-soft);
}

.cover-link img {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 14rem;
  object-fit: cover;
  object-position: center 20%;
}

.featured-copy {
  align-self: center;
  padding: clamp(1.2rem, 3vw, 2rem);
}

.post-meta {
  margin-bottom: 0.55rem;
  color: var(--mad-muted);
  font-size: 0.82rem;
}

.featured-copy h3 {
  margin-bottom: 0.7rem;
  font-size: clamp(1.25rem, 3vw, 1.7rem);
}

.featured-copy h3 a,
.read-link,
.home-footer a {
  color: var(--mad-accent);
  text-decoration: none;
}

.featured-copy > p:not(.post-meta) {
  color: var(--mad-muted);
  font-size: 0.92rem;
  line-height: 1.8;
}

.read-link {
  display: inline-flex;
  gap: 0.4rem;
  margin-top: 0.2rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.home-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.8rem;
  margin-top: 1.4rem;
  color: var(--mad-muted);
  font-size: 0.75rem;
  letter-spacing: 0.06em;
}

@media (max-width: 640px) {
  .featured-card {
    grid-template-columns: 1fr;
  }

  .cover-link,
  .cover-link img {
    min-height: 12rem;
    max-height: 15rem;
  }
}
</style>
