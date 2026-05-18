import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { AuthLogger } from 'src/logger/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AuthLogger) {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const start = Date.now();

    const { method, originalUrl } = request;

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.logRequest(
            method,
            originalUrl,
            response.statusCode,
            Date.now() - start,
          );
        },
        error: (err: { status?: number }) => {
          const status = err?.status ?? 500;
          this.logger.logRequest(
            method,
            originalUrl,
            status,
            Date.now() - start,
          );
        },
      }),
    );
  }
}

// import {
//   CallHandler,
//   ExecutionContext,
//   Injectable,
//   NestInterceptor,
// } from '@nestjs/common';
// import { Observable, throwError } from 'rxjs';
// import { catchError, tap } from 'rxjs/operators';

// @Injectable()
// export class LoggingInterceptor implements NestInterceptor {
//   intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
//     const path = context.getArgs()[0]?.url;
//     const method = context.getArgs()[0]?.method;
//     const controller = context.getClass().name;
//     const pattern = context.getHandler().name;
//     const now = Date.now();

//     return next.handle().pipe(
//       tap(() =>
//         console.info(
//           `Success => [${method} -- ${path}] => [${controller} => ${pattern}] -- After... ${Date.now() - now}ms`,
//         ),
//       ),
//       catchError((error) => {
//         console.error(
//           `Error => [${controller} => ${pattern}] ,  ${error.message} -- After... ${Date.now() - now}ms`,
//         );
//         return throwError(() => error);
//       }),
//     );
//   }
// }
