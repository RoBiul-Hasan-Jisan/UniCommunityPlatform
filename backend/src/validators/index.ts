import { z } from "zod";

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "must be a valid id");

const text = (max, min = 1) => z.string().trim().min(min, "is required").max(max, `must be at most ${max} characters`);

export const POST_CATEGORIES = [
  "Discussion", "Question", "Achievement", "Career", "Research",
  "Internship", "Job Opportunity", "Project", "Announcement", "General",
];

const imageUrl = z.string().url().max(500).refine((u) => u.startsWith("https://"), "must be an https URL");

export const createPostSchema = z.object({
  content: text(5000),
  category: z.enum(POST_CATEGORIES).optional(),
  images: z.array(imageUrl).max(4).optional(),
});

export const updatePostSchema = z.object({
  content: text(5000).optional(),
  category: z.enum(POST_CATEGORIES).optional(),
});

export const commentSchema = z.object({
  text: text(2000),
  parentComment: objectId.nullish(),
});

export const startConversationSchema = z.object({ userId: objectId });

export const sendMessageSchema = z
  .object({
    text: z.string().trim().max(4000).optional().default(""),
    attachmentUrl: imageUrl.optional(),
  })
  .refine((v) => v.text.length > 0 || v.attachmentUrl, { message: "Message text or an attachment is required", path: ["text"] });

export const registerSchema = z.object({
  idToken: z.string().min(10, "Missing ID token"),
  role: z.enum(["student", "alumni"]).optional(),
  department: z.string().trim().max(120).optional(),
  name: z.string().trim().max(120).optional(),
});

export const reportSchema = z.object({
  targetType: z.enum(["post", "comment", "user", "job", "event", "project", "workshop"]),
  targetId: objectId,
  reason: text(1000),
});

export const eventSchema = z.object({
  title: text(200),
  description: text(5000),
  date: z.coerce.date(),
  time: z.string().trim().max(40).optional(),
  mode: z.enum(["Online", "In-person"]).optional(),
  location: z.string().trim().max(300).optional(),
  category: z.enum(["Reunion", "Meetup", "Networking", "Social", "Other"]).optional(),
  capacity: z.coerce.number().int().min(0).max(100000).optional(),
});

const strList = z.array(z.string().trim().max(80)).max(50);
export const updateProfileSchema = z
  .object({
    name: text(120),
    department: z.string().trim().max(120),
    about: z.string().trim().max(3000),
    skills: strList,
    achievements: z.array(z.string().trim().max(300)).max(50),
    studentId: z.string().trim().max(40),
    batch: z.string().trim().max(40),
    semester: z.string().trim().max(40),
    interests: strList,
    projects: z.array(z.string().trim().max(300)).max(50),
    alumniId: z.string().trim().max(40),
    graduationYear: z.string().trim().max(10),
    currentCompany: z.string().trim().max(120),
    currentPosition: z.string().trim().max(120),
    industry: z.string().trim().max(120),
    location: z.string().trim().max(120),
    experience: z.array(z.string().trim().max(300)).max(50),
    // Either a Cloudinary https URL or the legacy small base64 data URI.
    avatarUrl: z.string().max(400_000).refine((v) => v === "" || v.startsWith("https://") || v.startsWith("data:image/"), "must be an image"),
    emailNotifications: z.boolean(),
  })
  .partial();

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});
