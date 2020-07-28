// -*- mode: java; c-basic-offset: 2; -*-
// Copyright 2019 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

package com.example.facemesh;

import android.Manifest;
import android.Manifest.permission;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.util.Log;
import android.view.WindowManager.LayoutParams;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.google.appinventor.components.annotations.DesignerComponent;
import com.google.appinventor.components.annotations.DesignerProperty;
import com.google.appinventor.components.annotations.SimpleEvent;
import com.google.appinventor.components.annotations.SimpleObject;
import com.google.appinventor.components.annotations.SimpleProperty;
import com.google.appinventor.components.annotations.UsesAssets;
import com.google.appinventor.components.annotations.UsesPermissions;
import com.google.appinventor.components.common.ComponentCategory;
import com.google.appinventor.components.common.PropertyTypeConstants;
import com.google.appinventor.components.runtime.AndroidNonvisibleComponent;
import com.google.appinventor.components.runtime.Deleteable;
import com.google.appinventor.components.runtime.EventDispatcher;
import com.google.appinventor.components.runtime.Form;
import com.google.appinventor.components.runtime.OnPauseListener;
import com.google.appinventor.components.runtime.OnResumeListener;
import com.google.appinventor.components.runtime.OnStopListener;
import com.google.appinventor.components.runtime.PermissionResultHandler;
import com.google.appinventor.components.runtime.WebViewer;
import com.google.appinventor.components.runtime.util.ErrorMessages;
import com.google.appinventor.components.runtime.util.JsonUtil;
import com.google.appinventor.components.runtime.util.SdkLevel;
import com.google.appinventor.components.runtime.util.YailList;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

@DesignerComponent(version = 1,
    category = ComponentCategory.EXTENSION,
    description = "An extension that embeds a facemesh model.",
    iconName = "aiwebres/icon.png",
    nonVisible = true)
@SimpleObject(external = true)
@UsesAssets(fileNames = "tf-converter.min.js, tf-core.min.js, tf-core.min.js, tf-converter.min.js, facemesh.min.js, model.json, group1-shard1of1.bin, index.html, app.js")
@UsesPermissions({Manifest.permission.CAMERA})
public class FaceExtension extends AndroidNonvisibleComponent
    implements OnResumeListener, OnPauseListener, OnStopListener, Deleteable {
  private static final String LOG_TAG = FaceExtension.class.getSimpleName();
  private static final String ERROR_WEBVIEWER_NOT_SET =
      "You must specify a WebViewer using the WebViewer designer property before you can call %1s";
  private static final int ERROR_JSON_PARSE_FAILED = 101;
  private static final String MODEL_URL =
      "https://tfhub.dev/mediapipe/tfjs-model/facemesh/1/default/1/";
  private static final String BACK_CAMERA = "Back";
  private static final String FRONT_CAMERA = "Front";

  private WebView webview = null;
  private final Map<String, YailList> keyPoints = new ConcurrentHashMap<>();
  private String cameraMode = FRONT_CAMERA;
  private boolean initialized = false;
  private boolean enabled = true;
  private String BackgroundImage = "";

  /**
   * Creates a new FaceExtension extension.
   *
   * @param form the container that this component will be placed in
   */
  public FaceExtension(Form form) {
    super(form);
    requestHardwareAcceleration(form);
    WebView.setWebContentsDebuggingEnabled(true);
    keyPoints.put("forehead", YailList.makeEmptyList());
    keyPoints.put("leftCheek", YailList.makeEmptyList());
    keyPoints.put("rightCheek", YailList.makeEmptyList());
    keyPoints.put("chin", YailList.makeEmptyList());
    keyPoints.put("leftEyeInnerCorner", YailList.makeEmptyList());

    Log.d(LOG_TAG, "Created FaceExtension extension");
  }

  @SuppressLint("SetJavaScriptEnabled")
  private void configureWebView(WebView webview) {
    this.webview = webview;
    webview.getSettings().setJavaScriptEnabled(true);
    webview.getSettings().setMediaPlaybackRequiresUserGesture(false);
    webview.addJavascriptInterface(new AppInventorTFJS(), "FaceExtension");
    webview.setWebViewClient(new WebViewClient() {
      @Override
      public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        String url = request.getUrl().toString();
        Log.d(LOG_TAG, "shouldInterceptRequest called");
        if (url.startsWith(MODEL_URL)) {
          if (url.indexOf("?") >= 0) {
            url = url.substring(0, url.indexOf("?"));
          }
          Log.d(LOG_TAG, "overriding " + url);
          InputStream is;
          try {
            is = form.openAssetForExtension(FaceExtension.this,
                url.substring(MODEL_URL.length()));
            String contentType, charSet;
            if (url.endsWith(".json")) {
              contentType = "application/json";
              charSet = "UTF-8";
            } else {
              contentType = "application/octet-stream";
              charSet = "binary";
            }
            if (SdkLevel.getLevel() >= SdkLevel.LEVEL_LOLLIPOP) {
              Map<String, String> responseHeaders = new HashMap<>();
              responseHeaders.put("Access-Control-Allow-Origin", "*");
              return new WebResourceResponse(contentType, charSet, 200, "OK", responseHeaders, is);
            } else {
              return new WebResourceResponse(contentType, charSet, is);
            }
          } catch (IOException e) {
            e.printStackTrace();
          }
        }
        Log.d(LOG_TAG, url);
        return super.shouldInterceptRequest(view, request);
      }
    });
    webview.setWebChromeClient(new WebChromeClient() {
      @Override
      public void onPermissionRequest(final PermissionRequest request) {
        Log.d(LOG_TAG, "onPermissionRequest called");
        String[] requestedResources = request.getResources();
        for (String r : requestedResources) {
          if (r.equals(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
            form.askPermission(permission.CAMERA, new PermissionResultHandler() {
              @Override
              public void HandlePermissionResponse(String permission, boolean granted) {
                if (granted) {
                  request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                } else {
                  form.dispatchPermissionDeniedEvent(FaceExtension.this, "Enable", permission);
                }
              }
            });
          }
        }
      }
    });
  }

  @SuppressWarnings("squid:S00100")
  @DesignerProperty(editorType = PropertyTypeConstants.PROPERTY_TYPE_COMPONENT
      + ":com.google.appinventor.components.runtime.WebViewer")
  @SimpleProperty(userVisible = false)
  public void WebViewer(WebViewer webviewer) {
    if (webviewer != null) {
      configureWebView((WebView) webviewer.getView());
      webview.requestLayout();
    }
    try {
      Log.d(LOG_TAG, "isHardwareAccelerated? " + webview.isHardwareAccelerated());
      webview.loadUrl(form.getAssetPathForExtension(this, "index.html"));
    } catch(FileNotFoundException e) {
      Log.e(LOG_TAG, "Unable to load tensorflow", e);
    }
  }

  public void Initialize() {
    if (webview != null) {
      initialized = true;
    }
  }

  @SimpleProperty(description = "Position of forehead")
  public YailList Forehead() {
    return keyPoints.get("forehead");
  }

 @SimpleProperty(description = "Position of chin")
  public YailList Chin() {
    return keyPoints.get("chin");
  }

 @SimpleProperty(description = "Position of left cheek")
  public YailList LeftCheek() {
    return keyPoints.get("leftCheek");
  }

 @SimpleProperty(description = "Position of right cheek")
  public YailList RightCheek() {
    return keyPoints.get("rightCheek");
  }

  @SimpleProperty(description = "Position of left eye inner corner")
  public YailList LeftEyeInnerCorner() {
    return keyPoints.get("leftEyeInnerCorner");
  }

  @SimpleProperty(description = "Background Image.")
  public String BackgroundImage() {
    return BackgroundImage;
  }

  @DesignerProperty(editorType = PropertyTypeConstants.PROPERTY_TYPE_BOOLEAN, defaultValue = "True")
  @SimpleProperty
  public void Enabled(boolean enabled) {
    this.enabled = enabled;
    if (initialized) {
      assertWebView("Enabled");
      webview.evaluateJavascript(enabled ? "startVideo();" : "stopVideo();", null);
    }
  }

  @SimpleProperty(description = "Enables or disables the model.")
  public boolean Enabled() {
    return enabled;
  }

  @SuppressWarnings("squid:S00100")
  @SimpleEvent(description = "Event indicating that the model is ready.")
  public void ModelReady() {
    EventDispatcher.dispatchEvent(this, "ModelReady");
  }

  @SuppressWarnings("squid:S00100")
  @SimpleEvent(description = "Event indicating that an error has occurred.")
  public void Error(int errorCode, String errorMessage) {
    EventDispatcher.dispatchEvent(this, "Error", errorCode, errorMessage);
  }

  @SuppressWarnings("squid:S00100")
  @SimpleEvent(description = "Event indicating that model successfully got a result.")
  public void FaceUpdated() {
    EventDispatcher.dispatchEvent(this, "FaceUpdated");
  }

  @SuppressWarnings("squid:S00100")
  @SimpleEvent(description = "Event indicating that a new video frame is ready. ")
  public void VideoUpdated() {
    EventDispatcher.dispatchEvent(this, "VideoUpdated");
  }

  @SimpleProperty(description = "Configures FaceExtension to use the front or " +
      "back camera on the device.")
  @DesignerProperty(editorType = PropertyTypeConstants.PROPERTY_TYPE_CHOICES,
      editorArgs = {BACK_CAMERA, FRONT_CAMERA}, defaultValue = FRONT_CAMERA)
  public void UseCamera(String mode) {
    if (BACK_CAMERA.equals(mode) || FRONT_CAMERA.equals(mode)) {
      cameraMode = mode;
      if (initialized) {
        boolean frontFacing = mode.equals(FRONT_CAMERA);
        webview.evaluateJavascript("setCameraFacingMode(" + frontFacing + ");", null);
      }
    } else {
      form.dispatchErrorOccurredEvent(this, "UseCamera", ErrorMessages.ERROR_EXTENSION_ERROR,
          1, LOG_TAG, "Invalid camera selection. Must be either 'Front' or 'Back'.");
    }
  }

  @SimpleProperty
  public String UseCamera() {
    return cameraMode;
  }

  private static void requestHardwareAcceleration(Activity activity) {
    activity.getWindow().setFlags(LayoutParams.FLAG_HARDWARE_ACCELERATED,
        LayoutParams.FLAG_HARDWARE_ACCELERATED);
  }

  @SuppressWarnings("SameParameterValue")
  private void assertWebView(String method) {
    if (webview == null) {
      throw new IllegalStateException(String.format(ERROR_WEBVIEWER_NOT_SET, method));
    }
  }

  @Override
  public void onDelete() {
    if (initialized && webview != null) {
      webview.evaluateJavascript("teardown();", null);
      webview = null;
    }
  }

  @Override
  public void onPause() {
    if (initialized && webview != null) {
      webview.evaluateJavascript("stopVideo();", null);
    }
  }

  @Override
  public void onResume() {
    if (initialized && enabled && webview != null) {
      webview.evaluateJavascript("startVideo();", null);
    }
  }

  @Override
  public void onStop() {
    if (initialized && webview != null) {
      webview.evaluateJavascript("teardown();", null);
      webview = null;
    }
  }

  private class AppInventorTFJS {
    @JavascriptInterface
    public void ready() {
      form.runOnUiThread(new Runnable() {
        @Override
        public void run() {
          ModelReady();
          if (enabled) {
            UseCamera(cameraMode);
          }
        }
      });
    }

    @JavascriptInterface
    public void reportImage(final String dataUrl) {
      Log.d(LOG_TAG, "reportImage "  + dataUrl);
      if (dataUrl != null) {
        BackgroundImage = dataUrl.substring(dataUrl.indexOf(",") + 1);
        form.runOnUiThread(new Runnable() {
          @Override
          public void run() {
            VideoUpdated();
          }
        });
      }
    }

    @JavascriptInterface 
    public void reportResult(final String result) {
      try {
        // final Object parsedResult = JsonUtil.getObjectFromJson(result, true);
        JSONObject res = new JSONObject(result);
        JSONObject forehead = res.getJSONObject("forehead");
        YailList foreHeadList = YailList.makeList(new Double[]{forehead.getDouble("x"), forehead.getDouble("y"), forehead.getDouble("z")});
        keyPoints.put("forehead", foreHeadList);

        JSONObject chin = res.getJSONObject("chin");
        YailList chinList = YailList.makeList(new Double[]{chin.getDouble("x"), chin.getDouble("y"), chin.getDouble("z")});
        keyPoints.put("chin", chinList); 

        JSONObject leftCheek = res.getJSONObject("leftCheek");
        YailList leftCheekList = YailList.makeList(new Double[]{leftCheek.getDouble("x"), leftCheek.getDouble("y"), leftCheek.getDouble("z")});
        keyPoints.put("leftCheek", leftCheekList);

        JSONObject rightCheek = res.getJSONObject("rightCheek");
        YailList rightCheekList = YailList.makeList(new Double[]{rightCheek.getDouble("x"), rightCheek.getDouble("y"), rightCheek.getDouble("z")});
        keyPoints.put("rightCheek", rightCheekList);

        JSONObject leftEyeInnerCorner = res.getJSONObject("leftEyeInnerCorner");
        YailList leftEyeInnerCornerList = YailList.makeList(new Double[]{leftEyeInnerCorner.getDouble("x"), leftEyeInnerCorner.getDouble("y"), leftEyeInnerCorner.getDouble("z")});
        keyPoints.put("leftEyeInnerCorner", leftEyeInnerCornerList);
  
        form.runOnUiThread(new Runnable() {
          @Override
          public void run() {
            FaceUpdated();
          }
        });

      } catch (final JSONException e) {
        form.runOnUiThread(new Runnable() {
          @Override
          public void run() {
            Error(ERROR_JSON_PARSE_FAILED, e.getMessage());
          }
        });
        Log.e(LOG_TAG, "Error parsing JSON from web view", e);
      }
    }

    @JavascriptInterface
    public void error(final int errorCode, final String errorMessage) {
      form.runOnUiThread(new Runnable() {
        @Override
        public void run() {
          Error(errorCode, errorMessage);
        }
      });
    }
  }
}