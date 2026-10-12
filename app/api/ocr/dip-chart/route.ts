import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface VisionRow {
  dip_cm: number;
  volume_litres: number;
  confidence?: number;
  flagged?: boolean;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json({ success: false, error: "تصویر فراہم نہیں کی گئی" }, { status: 400 });
    }

    // Check for Gemini Vision API key
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (geminiKey) {
      try {
        const base64Data = image.includes("base64,") ? image.split("base64,")[1] : image;
        const mimeType = image.includes("data:image/png") ? "image/png" : "image/jpeg";

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: "You are dip chart reader. Read this petrol tank dip chart image. Extract table with 2 columns: Dip (cm) and Volume (Litres). Return JSON array [{dip_cm: 10, volume_litres: 150}, ...]. Ignore headers. If blurry, guess best. Return ONLY JSON.",
                    },
                    {
                      inlineData: {
                        mimeType,
                        data: base64Data,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json",
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const formattedRows: VisionRow[] = parsed
                .map((r: any) => ({
                  dip_cm: Number(r.dip_cm ?? r.dip ?? r.cm),
                  volume_litres: Number(r.volume_litres ?? r.volume_liters ?? r.litres ?? r.liters ?? r.volume),
                  confidence: 96,
                  flagged: false,
                }))
                .filter((r) => !isNaN(r.dip_cm) && !isNaN(r.volume_litres))
                .sort((a, b) => a.dip_cm - b.dip_cm);

              // Validate monotonicity and flag unexpected drops
              for (let i = 1; i < formattedRows.length; i++) {
                if (formattedRows[i].volume_litres < formattedRows[i - 1].volume_litres) {
                  formattedRows[i].confidence = 55;
                  formattedRows[i].flagged = true;
                }
              }

              return NextResponse.json({
                success: true,
                method: "gemini_vision",
                rows: formattedRows,
              });
            }
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini vision fallback to client OCR:", geminiErr);
      }
    }

    if (openaiKey) {
      try {
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "You are dip chart reader. Read this petrol tank dip chart image. Extract table with 2 columns: Dip (cm) and Volume (Litres). Return JSON array [{dip_cm: 10, volume_litres: 150}, ...]. Ignore headers. If blurry, guess best. Return ONLY JSON.",
                  },
                  {
                    type: "image_url",
                    image_url: { url: image },
                  },
                ],
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
          }),
        });

        if (openaiRes.ok) {
          const aiData = await openaiRes.json();
          const content = aiData?.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            const arrayData = Array.isArray(parsed) ? parsed : parsed.rows || parsed.chart || parsed.data || [];
            const formattedRows: VisionRow[] = arrayData
              .map((r: any) => ({
                dip_cm: Number(r.dip_cm ?? r.dip ?? r.cm),
                volume_litres: Number(r.volume_litres ?? r.volume_liters ?? r.litres ?? r.volume),
                confidence: 95,
                flagged: false,
              }))
              .filter((r: any) => !isNaN(r.dip_cm) && !isNaN(r.volume_litres))
              .sort((a: any, b: any) => a.dip_cm - b.dip_cm);

            return NextResponse.json({
              success: true,
              method: "openai_vision",
              rows: formattedRows,
            });
          }
        }
      } catch (aiErr) {
        console.warn("OpenAI vision fallback to client OCR:", aiErr);
      }
    }

    // No vision API key configured: signal client to run optimized Tesseract with table mode
    return NextResponse.json({
      success: true,
      method: "client_engine",
      message: "Direct client-side OCR engine enabled",
      rows: [],
    });
  } catch (error: any) {
    console.error("OCR API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
