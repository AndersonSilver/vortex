import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { env } from "./env";

export const s3Client = new S3Client({
  endpoint: env.minio.endpoint,
  region: "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.minio.accessKey,
    secretAccessKey: env.minio.secretKey,
  },
});

function publicReadPolicy(bucket: string) {
  return JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { AWS: ["*"] },
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  });
}

export async function ensureBucketExists(): Promise<void> {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: env.minio.bucket }));
  } catch {
    try {
      await s3Client.send(new CreateBucketCommand({ Bucket: env.minio.bucket }));
    } catch (error) {
      console.warn("Não foi possível criar/verificar o bucket do MinIO:", (error as Error).message);
    }
  }
  try {
    await s3Client.send(
      new PutBucketPolicyCommand({ Bucket: env.minio.bucket, Policy: publicReadPolicy(env.minio.bucket) }),
    );
  } catch (error) {
    console.warn("Não foi possível aplicar a política pública do bucket:", (error as Error).message);
  }
}

async function uploadFile(
  buffer: Buffer,
  originalName: string,
  prefix: string,
  contentType: string,
): Promise<string> {
  const key = `${prefix}/${randomUUID()}-${originalName.replace(/\s+/g, "_")}`;
  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.minio.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  return `${env.minio.publicEndpoint}/${env.minio.bucket}/${key}`;
}

export function uploadQuoteFile(buffer: Buffer, originalName: string): Promise<string> {
  return uploadFile(buffer, originalName, "quotes", "application/octet-stream");
}

export function uploadProductImage(buffer: Buffer, originalName: string, contentType: string): Promise<string> {
  return uploadFile(buffer, originalName, "products/images", contentType);
}

export function uploadProductVideo(buffer: Buffer, originalName: string, contentType: string): Promise<string> {
  return uploadFile(buffer, originalName, "products/videos", contentType);
}
