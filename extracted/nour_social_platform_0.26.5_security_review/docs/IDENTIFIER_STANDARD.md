# Nūr Identifier Standard

Version: 0.19.0

## Rules
- Every route/page has a stable `page_*` DOM id.
- Named page sections use stable `section_*` ids.
- Controls use semantic ids: `btn_*`, `form_*`, `field_*`, `group_*`, and `list_*`.
- Repeated database-backed entities use a stable prefix plus the primary key, e.g. `post_<database-id>` and `comment_<database-id>`. The key is never derived from array position or display text.
- Dynamic child controls include the parent entity id to remain unique, e.g. `btn_post_reaction_<post-id>`.
- The DOM `id` is for UI automation/accessibility hooks; `data-entity-id` exposes the database record id where needed. They are related but not interchangeable.
- Database entities keep their database primary key (`id`/UUID). Foreign keys must reference those primary keys; never use a DOM id as a database key.
- API operations use stable route/operation names in docs and tests, e.g. `api_posts_create`, `api_posts_list`, `api_comments_create`, `api_reactions_toggle`, `api_users_profile`, `api_users_follow_toggle`, `api_users_block_toggle`, `api_media_presign`. These are logical identifiers, not extra HTTP parameters.
- IDs must be unique within the rendered document. Static IDs are reserved; dynamic IDs must include the unique database key.

## Current page map
| Page | DOM id | Route |
|---|---|---|
| Home | `page_home` | `/` |
| Feed | `page_feed` | `/feed` |
| Account | `page_account` | `/account` |
| Profile | `page_profile` | `/u/[username]` |
| Messages | `page_messages` | `/messages` |
| Notifications | `page_notifications` | `/notifications` |
| Search | `page_search` | `/search` |
| Stories | `page_stories` | `/stories` |
| Offline fallback | `page_offline` | `/offline` |

## Current control map
- Home: `section_home_header`, `section_home_hero`, `section_home_values`, `section_home_features`, `section_home_vision`, `section_home_build`, `section_home_footer`.
- Feed: `section_feed_header`, `section_feed_layout`, `section_feed_sidebar`, `section_feed_main`, `btn_feed_refresh`, `form_post_create`, `field_post_body`, `field_post_visibility`, `field_post_image`, `preview_post_image`, `btn_post_image_clear`, `btn_post_create_submit`, `list_feed_posts`.
- Each post: `post_<post-id>`, `btn_post_reaction_<post-id>`, `section_post_comments_<post-id>`, `section_post_media_<post-id>`, `media_<media-id>`, `form_comment_<post-id>`, `field_comment_body_<post-id>`, `btn_comment_submit_<post-id>`, `link_post_author_<post-id>`.
- Each comment: `comment_<comment-id>`.
- Account: `section_account_card`, `group_account_mode`, `btn_account_mode_login`, `btn_account_mode_register`, `form_account_login` / `form_account_register`, `field_account_display_name`, `field_account_username`, `field_account_email`, `field_account_password`, `btn_account_submit`, `btn_account_logout`, `btn_account_logout_all`.
- Profile: `section_profile_header`, `section_profile_layout`, `section_profile_sidebar`, `section_profile_main`, `profile_<user-id>`, `stat_profile_posts`, `stat_profile_followers`, `stat_profile_following`, `btn_profile_follow_<user-id>`, `btn_profile_block_<user-id>`, `list_profile_posts`, `section_profile_posts_title`.
- Messages: `section_messages_header`, `section_messages_layout`, `section_messages_sidebar`, `section_messages_main`, `form_messages_start`, `field_messages_start_username`, `btn_messages_start_submit`, `list_messages_conversations`, `btn_conversation_<id>`, `list_messages_thread`, `message_<id>`, `form_messages_send`, `field_messages_body`, `btn_messages_send`.
- Profile extra: `btn_profile_message_<user-id>`, `btn_profile_report_<user-id>`.
- Offline fallback: `section_offline_card`.

## Adding a new feature
1. Assign a page id if it creates a route.
2. Assign ids to major sections and interactive controls.
3. For repeated records, suffix ids with the immutable database primary key.
4. Add the IDs to this document and to automated UI tests.
5. Never silently rename an existing ID: treat changes as compatibility changes for tests and automation.

## Automated checks (0.19.0)
- Run `pnpm check:ids` from the repository root to check literal ID uniqueness per TS/TSX file, required route IDs, and key dynamic post/comment control patterns, and explicit IDs on all interactive anchors, buttons, inputs, textareas, selects, and forms.
- This is a static source check; it does not prove uniqueness after all components render together. Runtime DOM uniqueness remains NOT VERIFIED until browser tests can run against a built app.

