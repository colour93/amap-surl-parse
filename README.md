## amap-surl-parse

使用方法

GET `https://amap-surl-parse.fur93.icu/?url=${url}`

响应示例

```JSON
{
    "code": 0,
    "msg": "ok",
    "data": {
        "id": "B000A7BD6C",
        "lng": 116.326936,
        "lat": 40.003213,
        "locationString": "116.326936,40.003213",
        "locationStringGeneral": "116.326936°E 40.003213°N",
        "name": "清华大学",
        "formattedAddress": "北京市海淀区双清路30号",
        "regionalismCode": "110000"
    }
}
```