import express from "express";
import axios, { AxiosError } from "axios";
import cors from "cors";

const axiosInstance = axios.create({
  maxRedirects: 0,
});

class UnsupportedUrlError extends Error {
  code: string;
  constructor() {
    super("不支持的 url");
    this.code = "UNSUPPORTED_URL";
  }
}

class UnexpectedRedirectUrlError extends Error {
  code: string;
  redirectUrl: string;
  constructor(redirectUrl: string) {
    super("预料之外的重定向 url");
    this.code = "UNEXPECTED_REDIRECT_URL";
    this.redirectUrl = redirectUrl;
  }
}

class UnexpectedRedirectUrlQueryError extends Error {
  code: string;
  redirectUrl: string;
  constructor(redirectUrl: string) {
    super("预料之外的重定向 url 参数");
    this.code = "UNEXPECTED_REDIRECT_URL_QUERY";
    this.redirectUrl = redirectUrl;
  }
}

interface LocationInfo {
  id?: string;
  lat?: number;
  lng?: number;
  locationString?: string;
  locationStringGeneral?: string;
  name?: string;
  formattedAddress?: string;
  regionalismCode?: string;
}

const app = express();
const port = 3000;

app.use(cors());

app.get("/", async (req, res) => {
  const { url } = req.query as { url: string };

  if (!url) {
    res.send({
      code: 0,
      msg: "ok",
      data: {
        app: "amap-surl-parse",
        github: "https://github.com/colour93/amap-surl-parse",
      },
    });
    return;
  }

  try {
    const urlObj = new URL(url);

    if (urlObj.hostname != "surl.amap.com") throw new UnsupportedUrlError();

    const redirectRes = await axiosInstance
      .get(url)
      .catch((error: AxiosError) => {
        if (error.message == "Request failed with status code 302") {
          return error.response;
        } else {
          throw error;
        }
      });

    const redirectUrl: string = redirectRes?.headers.location;

    const redirectUrlObj = new URL(redirectUrl);
    if (redirectUrlObj.hostname != "wb.amap.com")
      throw new UnexpectedRedirectUrlError(redirectUrl);

    const rawQuery =
      redirectUrlObj.searchParams.get("p") ||
      redirectUrlObj.searchParams.get("q");

    let type: "p" | "q" | null = null;
    if (redirectUrlObj.searchParams.get("p")) type = "p";
    if (redirectUrlObj.searchParams.get("q")) type = "q";

    if (!rawQuery || !type)
      throw new UnexpectedRedirectUrlQueryError(redirectUrl);

    const locationInfo = queryParser(rawQuery, type);

    res.send({
      code: 0,
      msg: "ok",
      data: locationInfo,
    });
  } catch (error: any) {
    switch (error.code) {
      case "ERR_INVALID_URL":
        res.send({
          code: 400,
          msg: "无法解析 url，请确认格式是否正确",
          data: {},
        });
        break;

      case "UNSUPPORTED_URL":
        res.send({
          code: 400,
          msg: error.message,
          data: {},
        });
        break;

      case "UNEXPECTED_REDIRECT_URL":
        res.send({
          code: 500,
          msg: error.message,
          data: {
            redirectUrl: error.redirectUrl,
          },
        });
        break;

      case "UNEXPECTED_REDIRECT_URL_QUERY":
        res.send({
          code: 500,
          msg: error.message,
          data: {
            redirectUrl: error.redirectUrl,
          },
        });
        break;

      default:
        const timestamp = +new Date();

        console.error(`[ts-${timestamp}]`, error);

        res.send({
          code: 500,
          msg: "服务器内部未知错误",
          data: {
            timestamp,
          },
        });
        break;
    }
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const queryParser = (rawQuery: string, type: "p" | "q"): LocationInfo => {
  try {
    let id, latStr, lngStr, name, formattedAddress, regionalismCode;

    if (type == "p")
      [id, latStr, lngStr, name, formattedAddress, regionalismCode] =
        rawQuery.split(",");

    if (type == "q")
      [latStr, lngStr, formattedAddress, regionalismCode] =
        rawQuery.split(",");

    return {
      id,
      lng: Number(lngStr),
      lat: Number(latStr),
      locationString: lngStr + "," + latStr,
      locationStringGeneral: locationConvert(Number(lngStr), Number(latStr)),
      name,
      formattedAddress,
      regionalismCode,
    };
  } catch (error) {
    throw error;
  }
};

const locationConvert = (rawLng: number, rawLat: number) => {
  const lng = Math.abs(rawLng) + "°" + (rawLng > 0 ? "E" : "W");
  const lat = Math.abs(rawLat) + "°" + (rawLat > 0 ? "N" : "S");
  return lng + " " + lat;
};

export default app;
