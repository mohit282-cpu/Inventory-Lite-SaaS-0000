package com.inventorylite.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

import org.json.JSONObject;

public class ShopOverviewMediumWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_medium);

        JSONObject data = WidgetDataFetcher.getWidgetData(context);
        if (data != null) {
            views.setTextViewText(R.id.txt_sales_val, data.optString("todaySalesFormatted", "Rs. 0.00"));
            views.setTextViewText(R.id.txt_expenses_val, data.optString("todayExpensesFormatted", "Rs. 0.00"));
            views.setTextViewText(R.id.txt_stock_val, data.optInt("currentStockQty", 0) + " items");
            views.setTextViewText(R.id.txt_udhaar_val, data.optString("customerUdhaarFormatted", "Rs. 0.00"));
        } else {
            views.setTextViewText(R.id.txt_sales_val, "Not available");
            views.setTextViewText(R.id.txt_expenses_val, "Not available");
            views.setTextViewText(R.id.txt_stock_val, "Not available");
            views.setTextViewText(R.id.txt_udhaar_val, "Not available");
        }

        // Tap Handlers with deep links
        setLinkIntent(context, views, R.id.btn_sales, "/app/sales", 101);
        setLinkIntent(context, views, R.id.btn_expenses, "/app/expenses", 102);
        setLinkIntent(context, views, R.id.btn_stock, "/app/stock", 103);
        setLinkIntent(context, views, R.id.btn_udhaar, "/app/credit", 104);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static void setLinkIntent(Context context, RemoteViews views, int viewId, String routePath, int requestCode) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(WidgetDataFetcher.APP_BASE_URL + routePath));
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(viewId, pendingIntent);
    }
}
