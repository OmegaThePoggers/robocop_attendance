import logging
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from core.config import settings

logger = logging.getLogger(__name__)


class S3Service:
    """S3-compatible object storage service (works with AWS S3 or MinIO)."""

    def __init__(self):
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
        )
        self._bucket = settings.S3_BUCKET_NAME
        self._ensure_bucket()

    def _ensure_bucket(self) -> None:
        """FIX 6: Create the bucket if it does not already exist (idempotent)."""
        try:
            self._client.head_bucket(Bucket=self._bucket)
        except ClientError as e:
            error_code = int(e.response["Error"]["Code"])
            if error_code == 404:
                try:
                    # MinIO and AWS S3 have different create-bucket semantics
                    if settings.S3_REGION == "us-east-1":
                        self._client.create_bucket(Bucket=self._bucket)
                    else:
                        self._client.create_bucket(
                            Bucket=self._bucket,
                            CreateBucketConfiguration={"LocationConstraint": settings.S3_REGION},
                        )
                    logger.info("Created S3 bucket: %s", self._bucket)
                except ClientError as create_err:
                    logger.error("Failed to create bucket %s: %s", self._bucket, create_err)
                    raise
            else:
                logger.error("Unexpected S3 error checking bucket: %s", e)
                raise

    async def upload_image(
        self, image_bytes: bytes, s3_key: str, content_type: str = "image/jpeg"
    ) -> str:
        """Upload bytes to S3 and return the object URL."""
        self._client.put_object(
            Bucket=self._bucket,
            Key=s3_key,
            Body=image_bytes,
            ContentType=content_type,
        )
        return f"{settings.S3_ENDPOINT_URL}/{self._bucket}/{s3_key}"

    async def get_image(self, s3_key_or_url: str) -> bytes:
        """Download image bytes from S3 by key or full URL."""
        key = s3_key_or_url
        prefix = f"{settings.S3_ENDPOINT_URL}/{self._bucket}/"
        if s3_key_or_url.startswith(prefix):
            key = s3_key_or_url[len(prefix):]
        response = self._client.get_object(Bucket=self._bucket, Key=key)
        return response["Body"].read()

    async def generate_presigned_url(self, s3_key: str, expires_in: int = 3600) -> str:
        """Generate a time-limited presigned URL for direct client access."""
        return self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self._bucket, "Key": s3_key},
            ExpiresIn=expires_in,
        )

    async def delete_image(self, s3_key: str) -> None:
        """Delete an object from S3."""
        try:
            self._client.delete_object(Bucket=self._bucket, Key=s3_key)
        except ClientError:
            pass  # idempotent — ignore if already deleted


# Singleton
s3_service = S3Service()
