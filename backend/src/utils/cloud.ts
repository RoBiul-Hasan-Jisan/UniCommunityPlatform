import { v2 as cloudinary } from "cloudinary";

// Image uploads are optional — enabled only when Cloudinary is configured
// (either CLOUDINARY_URL, or the three separate variables).
let configured = false;
export function uploadsEnabled() {
  if (configured) return true;
  const { CLOUDINARY_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (CLOUDINARY_URL) {
    cloudinary.config({ secure: true });
    configured = true;
  } else if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    cloudinary.config({ cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET, secure: true });
    configured = true;
  }
  return configured;
}

export function uploadImageBuffer(buffer, folder = "uniconnect") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        // Cap dimensions and let Cloudinary pick an efficient format.
        transformation: [{ width: 1600, height: 1600, crop: "limit", quality: "auto", fetch_format: "auto" }],
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}
