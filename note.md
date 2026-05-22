# VAI TRÒ
Bạn là Senior Software Developer, viết code production-grade, clean, secure, testable.

# NHIỆM VỤ
Implement thêm section vào trang home cho dự án Arc Quantum.

# NGỮ CẢNH DỰ ÁN
- Tech stack: Next.js (App Router) + TypeScript
- Domain: trang chủ, UI/UX, component
- Files liên quan:
  - app/page.tsx
  - components/ui/Section.tsx
- Requirements đầu vào:
  - Link các dự án cần giới thiệu ở trang chủ
  - Thiết kế UI/UX cho section này
- Kiến trúc/convention:
  - đồng nhất với phần hiện thị đã có ở trang chủ
  - sử dụng components có sẵn nếu phù hợp, hoặc tạo mới nếu cần
  <DL><p>
            <DT><A HREF="https://arc-auto-trade-web.vercel.app/" ADD_DATE="1779323968">Arc Auto Trade</A>
            <DT><A HREF="https://arc-quantum.vercel.app/balance" ADD_DATE="1779323760">Arc network</A>
            <DT><A HREF="https://gt-market.vercel.app/vi" ADD_DATE="1779324027">GT Market - NFT Marketplace</A>
            <DT><A HREF="https://import-day.vercel.app/" ADD_DATE="1779324039">import-day.vercel.app</A>
            <DT><A HREF="https://arc-p2p-payments.vercel.app/sign-in" ADD_DATE="1779324096" ICON="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADT0lEQVR4nFRTTWxUVRQ+59x337tvyjilaBE7Ggpt/QElhICiBltMtAtNjAnGhRuMITYuDK7ExMSN6YIFG5U4iT8bEwx2ATFWEmORgBDSLgRbFZRqOoWYgXZmyry/e9873HktCZzkJe+9e7/zne875ziwHGgfbr8MvX32GYnpXg/iIRdaZRdikMLMexxNIAdfVT575/SdGFz5gPLOX/2Ht/qjLkcjyklcSOqgwxa7GEHJT7GoCEQWaA+jw/9cvfr+0aOHwpUsH9G2l7epzvIDY0rScNyoZmlq0tX3SLH98W60ALg8/QcnjVrmu4a6SwUC0zhRDWuvViqV0LEJss5150eVdIbDsBH39T0kd+9Y4zy7dQ303KfyCmvXt8D0b3+KmckprlWvxKWC+2I/eaP26F0cfOvcUwUvPdWsL+ErL22h/a/fT5SLYkjT3BYQglaEMkyMfZud+fGHrKtU4DSp7yJPJPsUGelwAGuLGsleSnTKWcZtIBMh21hGW8XFVR5aL0CJRPrE+8ilZJCym+xRRJzqti0sCJGI2JqB7TAm5bkrs8uupxF4mBCagJWIBsnJgh5pM9p2oQMmp0qznBNJCNBawy/Hj2EcBvmZRM0ehig4sl2JekhCBC7GNoH9gTpX2lyKYHx8ChqLi3D2+zHY+Gg/9G3alBvqoEEPQrCVs8QQSAk975IGXwRcv3GjfQm7Ogv4yMYuPj32NfRt3gy9jz1hK0nytkcLcyDJsI8x+hbr2EE56Qne6/omvXzhomg0t3OpqHDDQC+u7x1hkgpTo0FKl5OlGly7eAqUkllBhE5mopMks1bFyVq6IBlMs8rHjxyzPAhZW7GwQ22ZyZE5++/ffQxLjQUuuAyUhdrF5HMxOTle3fXkc/cWldhpNSW1/y5R8/o1WD/QD66nciNNa4EvHPkQ/j7/E6tCUXf7oQscfzJ0cOYLO4lA9X9nD6za0D2w2sdhQ5j9de5n05idEjuef8G6nsCliW+4+f9cqjqKYq0KvURHJ5qL9Q84r3Ul9u/Z4z9YXjcqIRjpkMbVQR1EssDtXfA8Bzs7CCi9mfiUHJ6PZw68dghuL9Pd6/zpe288rTh+U5EeIojL0q6zT+G8bfOEgOTL3Qenz9yJuQUAAP//99vMpwAAAAZJREFUAwDCzYk1T6Ov0QAAAABJRU5ErkJggg==">Arc Pay</A>
            <DT><A HREF="https://arc-fintech-three.vercel.app/" ADD_DATE="1779324100" ICON="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABYElEQVR4nKyTPUvDUBSGT1JBijjYtZQIOnWxLaXEwa0QgpuDqOAH+RGZxdk/oYI4iUsmXYIBpYGA4OigaCCTi2imBN+TJphcrl/QA09Czj3ve08u99RIHotgFRyC7Tz3AV7FQkX4ngf7YA3MCmtv4Dxff5QZ6OAMaPRzPIENcFs2YNE1aNHf4hmssJmaJw5k4m63S8PhUGbQyjVZBwvgDsyUKxRFIcdxSNM06vf7FMexaPIOlriDgSjmME2TDMOgdrtNlmXJumDNgDu4BJU+6/U6eZ5HvV4v+w7DMOsiiiLR5EqVWfOOhZij2WySbduy0uwMNsFpkeB/DoKAGo1GpTBNU9J1nXzfL6e3pvAY0fhAsnPodDrkui4lSVIxUFU166pkwJpRcQ+OwA79L47B7sQuEl/P9fz9W1Rqa6WFF3AB5mh8uaYFIQ8Tz8oeuC+Syje78Dgv09con4Ab8CAWfgIAAP//5WrNRgAAAAZJREFUAwCSMlGPWGOBGwAAAABJRU5ErkJggg==">arc-fintech-starter-app</A>
            <DT><A HREF="https://arc-escrow-phi.vercel.app/" ADD_DATE="1779324103" ICON="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADT0lEQVR4nFRTTWxUVRQ+59x337tvyjilaBE7Ggpt/QElhICiBltMtAtNjAnGhRuMITYuDK7ExMSN6YIFG5U4iT8bEwx2ATFWEmORgBDSLgRbFZRqOoWYgXZmyry/e9873HktCZzkJe+9e7/zne875ziwHGgfbr8MvX32GYnpXg/iIRdaZRdikMLMexxNIAdfVT575/SdGFz5gPLOX/2Ht/qjLkcjyklcSOqgwxa7GEHJT7GoCEQWaA+jw/9cvfr+0aOHwpUsH9G2l7epzvIDY0rScNyoZmlq0tX3SLH98W60ALg8/QcnjVrmu4a6SwUC0zhRDWuvViqV0LEJss5150eVdIbDsBH39T0kd+9Y4zy7dQ303KfyCmvXt8D0b3+KmckprlWvxKWC+2I/eaP26F0cfOvcUwUvPdWsL+ErL22h/a/fT5SLYkjT3BYQglaEMkyMfZud+fGHrKtU4DSp7yJPJPsUGelwAGuLGsleSnTKWcZtIBMh21hGW8XFVR5aL0CJRPrE+8ilZJCym+xRRJzqti0sCJGI2JqB7TAm5bkrs8uupxF4mBCagJWIBsnJgh5pM9p2oQMmp0qznBNJCNBawy/Hj2EcBvmZRM0ehig4sl2JekhCBC7GNoH9gTpX2lyKYHx8ChqLi3D2+zHY+Gg/9G3alBvqoEEPQrCVs8QQSAk975IGXwRcv3GjfQm7Ogv4yMYuPj32NfRt3gy9jz1hK0nytkcLcyDJsI8x+hbr2EE56Qne6/omvXzhomg0t3OpqHDDQC+u7x1hkgpTo0FKl5OlGly7eAqUkllBhE5mopMks1bFyVq6IBlMs8rHjxyzPAhZW7GwQ22ZyZE5++/ffQxLjQUuuAyUhdrF5HMxOTle3fXkc/cWldhpNSW1/y5R8/o1WD/QD66nciNNa4EvHPkQ/j7/E6tCUXf7oQscfzJ0cOYLO4lA9X9nD6za0D2w2sdhQ5j9de5n05idEjuef8G6nsCliW+4+f9cqjqKYq0KvURHJ5qL9Q84r3Ul9u/Z4z9YXjcqIRjpkMbVQR1EssDtXfA8Bzs7CCi9mfiUHJ6PZw68dghuL9Pd6/zpe288rTh+U5EeIojL0q6zT+G8bfOEgOTL3Qenz9yJuQUAAP//99vMpwAAAAZJREFUAwDCzYk1T6Ov0QAAAABJRU5ErkJggg==">Workflow Escrow</A>
            <DT><A HREF="https://arc-commerce-rho.vercel.app/" ADD_DATE="1779324106" ICON="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABYElEQVR4nKyTPUvDUBSGT1JBijjYtZQIOnWxLaXEwa0QgpuDqOAH+RGZxdk/oYI4iUsmXYIBpYGA4OigaCCTi2imBN+TJphcrl/QA09Czj3ve08u99RIHotgFRyC7Tz3AV7FQkX4ngf7YA3MCmtv4Dxff5QZ6OAMaPRzPIENcFs2YNE1aNHf4hmssJmaJw5k4m63S8PhUGbQyjVZBwvgDsyUKxRFIcdxSNM06vf7FMexaPIOlriDgSjmME2TDMOgdrtNlmXJumDNgDu4BJU+6/U6eZ5HvV4v+w7DMOsiiiLR5EqVWfOOhZij2WySbduy0uwMNsFpkeB/DoKAGo1GpTBNU9J1nXzfL6e3pvAY0fhAsnPodDrkui4lSVIxUFU166pkwJpRcQ+OwA79L47B7sQuEl/P9fz9W1Rqa6WFF3AB5mh8uaYFIQ8Tz8oeuC+Syje78Dgv09con4Ab8CAWfgIAAP//5WrNRgAAAAZJREFUAwCSMlGPWGOBGwAAAABJRU5ErkJggg==">Arc Commerce</A>
            <DT><A HREF="https://arc-multichain-wallet.vercel.app/" ADD_DATE="1779324108" ICON="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABYElEQVR4nKyTPUvDUBSGT1JBijjYtZQIOnWxLaXEwa0QgpuDqOAH+RGZxdk/oYI4iUsmXYIBpYGA4OigaCCTi2imBN+TJphcrl/QA09Czj3ve08u99RIHotgFRyC7Tz3AV7FQkX4ngf7YA3MCmtv4Dxff5QZ6OAMaPRzPIENcFs2YNE1aNHf4hmssJmaJw5k4m63S8PhUGbQyjVZBwvgDsyUKxRFIcdxSNM06vf7FMexaPIOlriDgSjmME2TDMOgdrtNlmXJumDNgDu4BJU+6/U6eZ5HvV4v+w7DMOsiiiLR5EqVWfOOhZij2WySbduy0uwMNsFpkeB/DoKAGo1GpTBNU9J1nXzfL6e3pvAY0fhAsnPodDrkui4lSVIxUFU166pkwJpRcQ+OwA79L47B7sQuEl/P9fz9W1Rqa6WFF3AB5mh8uaYFIQ8Tz8oeuC+Syje78Dgv09con4Ab8CAWfgIAAP//5WrNRgAAAAZJREFUAwCSMlGPWGOBGwAAAABJRU5ErkJggg==">Multichain Gateway Wallet</A>
            <DT><A HREF="https://import-day-web.vercel.app/login" ADD_DATE="1779324112">My Day</A>
        </DL><p>

# YÊU CẦU KỸ THUẬT
- Clean code, SOLID, không hardcode secret
- Validate input + xử lý lỗi đầy đủ
- Tối ưu truy vấn DB, tránh N+1
- Không thay đổi ngoài scope
- Nếu thiếu thông tin quan trọng: hỏi trước khi implement

# OUTPUT BẮT BUỘC
1. Implementation overview
2. Code theo từng file
3. DB schema/migration (nếu có)
4. API contract (nếu có)
5. Unit test + test cases chính
6. Cách chạy và cấu hình
7. Known limitations/TODO

# ACCEPTANCE CRITERIA
- Đẹp mắt, đồng nhất với thiết kế trang chủ

# ƯU TIÊN
Complete feature