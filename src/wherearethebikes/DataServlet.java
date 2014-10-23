package wherearethebikes;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.ProtocolException;
import java.net.URL;
import java.net.URLEncoder;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public class DataServlet extends HttpServlet {
	
	private static final long serialVersionUID = 1L;
	public static final String urlBase = "http://api.citybik.es/";
	public static final String encoding = "UTF-8";
	
	public void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		resp.setContentType("text/plain");
		resp.setCharacterEncoding(encoding);
		
		String q = req.getParameter("q");
		
		try {
			URL requestUrl = new URL(urlBase + URLEncoder.encode(q, encoding) + ".json");
			
			HttpURLConnection connection = (HttpURLConnection)requestUrl.openConnection();
			connection.setDoInput(true);
			connection.setDoOutput(true);
			connection.setRequestMethod("GET");
			connection.setReadTimeout(10000);
			connection.setConnectTimeout(15000);
			connection.connect();
			InputStream inputStream = connection.getInputStream();
			BufferedReader streamReader = new BufferedReader(new InputStreamReader(inputStream, encoding));
			StringBuilder responseStrBuilder = new StringBuilder();

		    String inputStr;
		    while ((inputStr = streamReader.readLine()) != null) {
		    	responseStrBuilder.append(inputStr);
		    }

			resp.getWriter().println(responseStrBuilder.toString());
			
		} catch(MalformedURLException e) {
			resp.getWriter().println("{\"error\":\"0\"}");
		} catch(ProtocolException e) {
			resp.getWriter().println("{\"error\":\"0\"}");
		} catch(IOException e) {
			resp.getWriter().println("{\"error\":\"0\"}");
		} catch(NullPointerException e) {
			resp.getWriter().println("{\"error\":\"0\"}");
		} catch(Exception e) {
			resp.getWriter().println("{\"error\":\"0\"}");
		}	
		
	}
}
