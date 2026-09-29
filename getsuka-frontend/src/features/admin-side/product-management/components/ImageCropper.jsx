import { useEffect, useRef, useState } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";

import "react-image-crop/dist/ReactCrop.css";

const MAX_OUTPUT_SIZE = 1200;

const centerAspectCrop = (mediaWidth, mediaHeight, aspect) => {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 80,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
};

const getCroppedImage = async (image, crop, fileName) => {
  if (!crop?.width || !crop?.height) {
    return null;
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const sourceWidth = crop.width * scaleX;
  const sourceHeight = crop.height * scaleY;

  const scale = Math.min(
    1,
    MAX_OUTPUT_SIZE / sourceWidth,
    MAX_OUTPUT_SIZE / sourceHeight
  );

  const outputWidth = Math.round(sourceWidth * scale);
  const outputHeight = Math.round(sourceHeight * scale);

  const canvas = document.createElement("canvas");

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not create canvas context.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  context.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    outputWidth,
    outputHeight
  );

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result);
        } else {
          reject(new Error("Failed to create cropped image."));
        }
      },
      "image/jpeg",
      0.92
    );
  });

  return new File(
    [blob],
    fileName.replace(/\.[^/.]+$/, "") + "-cropped.jpg",
    {
      type: "image/jpeg",
    }
  );
};

const ImageCropper = ({ file, onApply, onCancel }) => {
  const imageRef = useRef(null);

  const [src, setSrc] = useState("");
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!file) {
      setSrc("");
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    setSrc(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const handleImageLoad = (event) => {
    const { width, height } = event.currentTarget;

    const initialCrop = centerAspectCrop(width, height, 1);

    setCrop(initialCrop);
  };

  const handleApply = async () => {
    if (!imageRef.current || !completedCrop) {
      return;
    }

    if (!completedCrop.width || !completedCrop.height) {
      return;
    }

    try {
      setIsProcessing(true);

      const croppedFile = await getCroppedImage(
        imageRef.current,
        completedCrop,
        file.name
      );

      if (croppedFile) {
        onApply(croppedFile);
      }
    } catch (error) {
      console.error("Image cropping failed:", error);
      alert("Failed to crop image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!file || !src) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl max-h-[95vh] overflow-y-auto border border-[#292929] bg-[#090c12] shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-[#292929] px-6 py-4">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-[#e9002d]">
              GETSUKA IMAGE EDITOR
            </p>

            <h2 className="mt-1 text-lg font-semibold text-white">
              Crop & Resize Image
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Adjust the crop area before adding this product image.
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="flex h-9 w-9 items-center justify-center border border-[#292929] text-gray-400 transition hover:border-[#e9002d] hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* CONTENT */}
        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_260px]">
          {/* CROP AREA */}
          <div className="flex min-h-[420px] items-center justify-center border border-[#292929] bg-[#05070b] p-4">
            <ReactCrop
              crop={crop}
              onChange={(newCrop) => {
                setCrop(newCrop);
              }}
              onComplete={(newCrop) => {
                setCompletedCrop(newCrop);
              }}
              aspect={1}
              keepSelection
              ruleOfThirds
            >
              <img
                ref={imageRef}
                src={src}
                alt="Product crop"
                onLoad={handleImageLoad}
                className="block max-h-[520px] max-w-full object-contain"
              />
            </ReactCrop>
          </div>

          {/* INFORMATION */}
          <div className="border border-[#292929] bg-[#0d1118] p-5">
            <p className="text-xs font-semibold tracking-[0.15em] text-white">
              IMAGE SETTINGS
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-gray-500">
                  File
                </p>

                <p className="mt-1 break-all text-sm text-gray-300">
                  {file.name}
                </p>
              </div>

              <div className="border-t border-[#292929] pt-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-gray-500">
                  Crop Ratio
                </p>

                <p className="mt-1 text-sm text-white">
                  1 : 1 Square
                </p>
              </div>

              <div className="border-t border-[#292929] pt-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-gray-500">
                  Maximum Output
                </p>

                <p className="mt-1 text-sm text-white">
                  1200 × 1200 px
                </p>
              </div>

              <div className="border-t border-[#292929] pt-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-gray-500">
                  Output Format
                </p>

                <p className="mt-1 text-sm text-white">
                  JPEG · High Quality
                </p>
              </div>

              <div className="border-t border-[#292929] pt-4">
                <p className="text-xs leading-5 text-gray-400">
                  Drag the crop box to reposition it. Drag the corners to
                  resize the selected area.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex flex-col gap-3 border-t border-[#292929] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            The original image will not be modified.
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="border border-[#292929] px-5 py-3 text-xs font-semibold text-gray-300 transition hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              CANCEL
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={!completedCrop || isProcessing}
              className="bg-[#e9002d] px-6 py-3 text-xs font-semibold text-white transition hover:bg-[#ff1744] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? "PROCESSING..." : "APPLY CROP →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;