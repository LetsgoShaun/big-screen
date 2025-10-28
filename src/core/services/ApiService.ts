import type { App } from "vue";
import type { AxiosResponse } from "axios";
import axios from "axios";
import VueAxios from "vue-axios";

const baseURL = '/api';

/**
 * @description service to call HTTP request via Axios
 */
class ApiService {
  /**
   * @description property to share vue instance
   */
  public static vueInstance: App;

  /**
   * @description initialize vue axios
   */
  public static init(app: App<Element>) {
    ApiService.vueInstance = app;
    ApiService.vueInstance.use(VueAxios, axios);
    ApiService.vueInstance.axios.defaults.baseURL = baseURL;

    // 添加请求拦截器
    ApiService.vueInstance.axios.interceptors.request.use(
      (config: any) => {
        // 添加 Authorization 请求头
        config.headers.Authorization = 'Basic YWRtaW46YWRtaW4=';
        
        // 判断网络是否连接
        if (window.navigator.onLine) {
          return config;
        } else {
          console.error('网络连接异常');
          return Promise.reject(new Error('网络连接异常'));
        }
      },
      (error: any) => {
        return Promise.reject(error);
      }
    );

    // 添加响应拦截器
    ApiService.vueInstance.axios.interceptors.response.use(
      (response: any) => {
        const { data } = response;
        if (data.status === "SUCCESS") {
          return response;
        } else {
          console.error('请求错误:', data.error || data.message);
          return Promise.reject(data);
        }
      },
      (error: any) => {
        const response = error.response;
        const data = response?.data;
        const errMsg = data && data.error ? data.error : '请求错误，请稍后重试！';
        console.error('请求失败:', errMsg);
        return Promise.reject(error.response);
      }
    );
  }

  /**
   * @description send the GET HTTP request
   * @param resource: string
   * @param params: AxiosRequestConfig
   * @returns Promise<AxiosResponse>
   */
  public static query(resource: string, params: any): Promise<AxiosResponse> {
    return ApiService.vueInstance.axios.get(resource, params);
  }

  /**
   * @description send the GET HTTP request
   * @param resource: string
   * @param config: any
   * @returns Promise<AxiosResponse>
   */
  public static get(resource: string, config?: any): Promise<AxiosResponse> {
    return ApiService.vueInstance.axios.get(`${resource}`, config);
  }

  /**
   * @description set the POST HTTP request
   * @param resource: string
   * @param params: any
   * @param config: any
   * @returns Promise<AxiosResponse>
   */
  public static post(resource: string, params: any, config?: any): Promise<AxiosResponse> {
    return ApiService.vueInstance.axios.post(`${resource}`, params, config);
  }

  /**
   * @description Send the PUT HTTP request
   * @param resource: string
   * @param params: any
   * @returns Promise<AxiosResponse>
   */
  public static put(resource: string, params: any): Promise<AxiosResponse> {
    return ApiService.vueInstance.axios.put(`${resource}`, params);
  }

  /**
   * @description Send the DELETE HTTP request
   * @param resource: string
   * @returns Promise<AxiosResponse>
   */
  public static delete(resource: string): Promise<AxiosResponse> {
    return ApiService.vueInstance.axios.delete(resource);
  }
}

export default ApiService;

