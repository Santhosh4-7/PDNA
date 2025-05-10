import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

// Heart Rate Service (connects to the backend)
class HeartRateService {
  // Base URL for the API - adjust based on your server location
  // For Android emulator, use 10.0.2.2 instead of localhost
  // For iOS simulator, use localhost
  // For physical devices, use your actual server IP address
  static const String baseUrl = 'http://localhost:3001/api/auth';
  
  // Stream controller for broadcasting heart rate updates
  final _heartRateController = StreamController<int>.broadcast();
  Stream<int> get heartRateStream => _heartRateController.stream;
  
  // Current BPM value
  int _currentBpm = 0;
  int get currentBpm => _currentBpm;
  
  // EventSource for Server-Sent Events
  EventSource? _eventSource;
  bool _isConnected = false;
  
  // Singleton pattern
  static final HeartRateService _instance = HeartRateService._internal();
  factory HeartRateService() => _instance;
  HeartRateService._internal();
  
  // Initialize and connect to the heart rate service
  Future<void> initialize() async {
    await _fetchCurrentHeartRate();
    _connectToEventSource();
  }
  
  // Fetch the current heart rate from the Arduino
  Future<int> _fetchCurrentHeartRate() async {
    try {
      final response = await http.post(Uri.parse('$baseUrl/bpm-current'));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        _currentBpm = data['bpm'];
        _heartRateController.add(_currentBpm);
        return _currentBpm;
      } else {
        print('Failed to fetch heart rate: ${response.statusCode}');
        return 0;
      }
    } catch (e) {
      print('Error fetching heart rate: $e');
      return 0;
    }
  }
  
  // Connect to Server-Sent Events for real-time updates from Arduino
  void _connectToEventSource() {
    if (_isConnected) return;
    
    try {
      _eventSource = EventSource('$baseUrl/bpm-events');
      _isConnected = true;
      
      _eventSource!.onMessage.listen((event) {
        final data = json.decode(event.data!);
        _currentBpm = data['bpm'];
        _heartRateController.add(_currentBpm);
      });
      
      _eventSource!.onError.listen((error) {
        print('EventSource error: $error');
        _isConnected = false;
        
        // Try to reconnect after a delay
        Future.delayed(Duration(seconds: 5), () {
          if (!_isConnected) {
            _connectToEventSource();
          }
        });
      });
    } catch (e) {
      print('Error connecting to heart rate events: $e');
      _isConnected = false;
    }
  }
  
  // Check if the heart rate is high and send alert if needed
  Future<Map<String, dynamic>> checkHighHeartRate(String email) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/checkHighBPM'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'email': email})
      );
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        print('Failed to check high heart rate: ${response.statusCode}');
        return {'error': 'Failed to check heart rate'};
      }
    } catch (e) {
      print('Error checking high heart rate: $e');
      return {'error': e.toString()};
    }
  }
  
  // Dispose resources
  void dispose() {
    _eventSource?.close();
    _isConnected = false;
    _heartRateController.close();
  }
}

// Simple EventSource implementation for Flutter
class EventSource {
  final String url;
  final StreamController<MessageEvent> _onMessageController = StreamController<MessageEvent>.broadcast();
  final StreamController<dynamic> _onErrorController = StreamController<dynamic>.broadcast();
  
  Stream<MessageEvent> get onMessage => _onMessageController.stream;
  Stream<dynamic> get onError => _onErrorController.stream;
  
  bool _isClosed = false;
  
  EventSource(this.url) {
    _connect();
  }
  
  void _connect() async {
    if (_isClosed) return;
    
    try {
      final client = http.Client();
      final request = http.Request('GET', Uri.parse(url));
      request.headers['Cache-Control'] = 'no-cache';
      request.headers['Accept'] = 'text/event-stream';
      
      final response = await client.send(request);
      
      if (response.statusCode != 200) {
        _onErrorController.add('Failed to connect: ${response.statusCode}');
        return;
      }
      
      response.stream.transform(utf8.decoder).transform(const LineSplitter()).listen((line) {
        if (_isClosed) {
          client.close();
          return;
        }
        
        if (line.startsWith('data: ')) {
          final data = line.substring(6);
          _onMessageController.add(MessageEvent(data));
        }
      }, onError: (error) {
        _onErrorController.add(error);
      }, onDone: () {
        if (!_isClosed) {
          // Try to reconnect
          Future.delayed(Duration(seconds: 3), _connect);
        }
      });
    } catch (e) {
      _onErrorController.add(e);
      
      if (!_isClosed) {
        // Try to reconnect
        Future.delayed(Duration(seconds: 3), _connect);
      }
    }
  }
  
  void close() {
    _isClosed = true;
    _onMessageController.close();
    _onErrorController.close();
  }
}

class MessageEvent {
  final String? data;
  
  MessageEvent(this.data);
}

// Heart Rate Widget
class HeartRateWidget extends StatefulWidget {
  final String email;
  final Color accentColor;
  final bool showGraph;
  final bool showHealthTips;

  const HeartRateWidget({
    Key? key,
    required this.email,
    this.accentColor = const Color(0xFFD55093), // Pink color by default
    this.showGraph = true,
    this.showHealthTips = true,
  }) : super(key: key);

  @override
  _HeartRateWidgetState createState() => _HeartRateWidgetState();
}

class _HeartRateWidgetState extends State<HeartRateWidget> with SingleTickerProviderStateMixin {
  final HeartRateService _heartRateService = HeartRateService();
  final List<int> _heartRateHistory = [];
  final int _maxHistoryPoints = 20;
  
  bool _isHighHeartRate = false;
  String _alertMessage = '';
  
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  
  Timer? _alertCheckTimer;

  @override
  void initState() {
    super.initState();
    
    // Initialize pulse animation for heart icon
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );
    
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.2).animate(
      CurvedAnimation(
        parent: _pulseController,
        curve: Curves.easeInOut,
      ),
    );
    
    // Setup pulse animation to repeat
    _pulseController.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        _pulseController.reverse();
      } else if (status == AnimationStatus.dismissed) {
        _pulseController.forward();
      }
    });
    
    // Start listening to heart rate updates
    _initializeHeartRateService();
    
    // Set up periodic high heart rate checks
    _setupHeartRateAlertCheck();
  }

  void _initializeHeartRateService() async {
    await _heartRateService.initialize();
    
    // Start heart pulse animation
    _pulseController.forward();
    
    // Listen to heart rate changes
    _heartRateService.heartRateStream.listen((bpm) {
      if (mounted) {
        setState(() {
          // Add to history, keeping only the most recent points
          _heartRateHistory.add(bpm);
          if (_heartRateHistory.length > _maxHistoryPoints) {
            _heartRateHistory.removeAt(0);
          }
          
          // Adjust animation speed based on heart rate
          // Lower heart rate = slower pulse, higher heart rate = faster pulse
          final newDuration = Duration(milliseconds: 60000 ~/ (bpm * 0.8));
          _pulseController.duration = newDuration;
        });
      }
    });
  }
  
  void _setupHeartRateAlertCheck() {
    // Check for high heart rate every 30 seconds
    _alertCheckTimer = Timer.periodic(const Duration(seconds: 30), (_) async {
      final result = await _heartRateService.checkHighHeartRate(widget.email);
      
      if (mounted) {
        setState(() {
          _isHighHeartRate = result['alert'] == true;
          if (_isHighHeartRate && result['message'] != null) {
            _alertMessage = result['message'];
          } else {
            _alertMessage = '';
          }
        });
      }
    });
    
    // Also check immediately on start
    Future.delayed(const Duration(seconds: 2), () async {
      final result = await _heartRateService.checkHighHeartRate(widget.email);
      
      if (mounted) {
        setState(() {
          _isHighHeartRate = result['alert'] == true;
          if (_isHighHeartRate && result['message'] != null) {
            _alertMessage = result['message'];
          }
        });
      }
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _alertCheckTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final currentBpm = _heartRateService.currentBpm;
    final healthTip = _getHealthTip(currentBpm);
    
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with title
            Row(
              children: [
                Icon(
                  Icons.favorite,
                  color: widget.accentColor,
                ),
                const SizedBox(width: 8),
                const Text(
                  'Heart Rate Monitor',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Spacer(),
                _ConnectionStatusDot(connected: currentBpm > 0),
              ],
            ),
            
            const SizedBox(height: 16),
            
            // Current BPM display with animated heart
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ScaleTransition(
                  scale: _pulseAnimation,
                  child: Icon(
                    Icons.favorite,
                    color: _isHighHeartRate ? Colors.red : widget.accentColor,
                    size: 50,
                  ),
                ),
                const SizedBox(width: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      currentBpm > 0 ? '$currentBpm BPM' : 'Connecting...',
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        color: _isHighHeartRate ? Colors.red : Colors.black87,
                      ),
                    ),
                    Text(
                      _getBpmDescription(currentBpm),
                      style: TextStyle(
                        color: _isHighHeartRate ? Colors.red : Colors.black54,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            
            // Alert message if heart rate is high
            if (_isHighHeartRate && _alertMessage.isNotEmpty)
              Container(
                margin: const EdgeInsets.only(top: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade300),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.warning_amber_rounded,
                      color: Colors.red.shade700,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _alertMessage,
                        style: TextStyle(
                          color: Colors.red.shade700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            
            // Heart rate history graph
            if (widget.showGraph && _heartRateHistory.length > 1)
              Container(
                height: 100,
                margin: const EdgeInsets.only(top: 16),
                child: HeartRateGraph(
                  dataPoints: _heartRateHistory,
                  lineColor: widget.accentColor,
                ),
              ),
            
            // Health tip based on current heart rate
            if (widget.showHealthTips && healthTip.isNotEmpty)
              Container(
                margin: const EdgeInsets.only(top: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.lightbulb_outline,
                      color: Colors.blue.shade700,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        healthTip,
                        style: TextStyle(
                          color: Colors.blue.shade700,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              
            // Source information
            Padding(
              padding: const EdgeInsets.only(top: 8.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.device_hub,
                    size: 14,
                    color: Colors.grey[600],
                  ),
                  SizedBox(width: 4),
                  Text(
                    'Data from Arduino Monitor',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  String _getBpmDescription(int bpm) {
    if (bpm == 0) return 'Connecting...';
    if (bpm < 60) return 'Below Resting Range';
    if (bpm < 80) return 'Resting Range';
    if (bpm < 90) return 'Elevated Range';
    if (bpm < 100) return 'Active Range';
    return 'High Range';
  }
  
  String _getHealthTip(int bpm) {
    if (bpm == 0) return '';
    
    if (bpm < 60) {
      return 'Your heart rate is below the typical resting range. This could be normal for physically fit people. If you feel dizzy or weak, consider contacting your healthcare provider.';
    }
    
    if (bpm < 80) {
      return 'Your heart rate is in the normal resting range. For pregnant women, a slight increase in resting heart rate is normal due to increased blood volume.';
    }
    
    if (bpm < 90) {
      return 'Your heart rate is slightly elevated. During pregnancy, it\'s normal for your heart rate to be about 10-15 beats higher than usual. Stay hydrated and take breaks when needed.';
    }
    
    if (bpm < 100) {
      return 'Your heart rate indicates you may be active or experiencing mild stress. Take a moment to breathe deeply. During pregnancy, it\'s important to avoid overexertion.';
    }
    
    return 'Your heart rate is elevated. Find a comfortable place to sit or lie down. Take slow, deep breaths. If your heart rate doesn\'t decrease or if you feel unwell, contact your healthcare provider.';
  }
}

// A small colored dot to indicate connection status
class _ConnectionStatusDot extends StatelessWidget {
  final bool connected;
  
  const _ConnectionStatusDot({
    Key? key,
    required this.connected,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: connected ? Colors.green : Colors.red,
          ),
        ),
        SizedBox(width: 4),
        Text(
          connected ? 'Connected' : 'Connecting...',
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }
}

// Graph to display heart rate history
class HeartRateGraph extends StatelessWidget {
  final List<int> dataPoints;
  final Color lineColor;
  
  const HeartRateGraph({
    Key? key,
    required this.dataPoints,
    this.lineColor = Colors.pink,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _HeartRateGraphPainter(
        dataPoints: dataPoints,
        lineColor: lineColor,
      ),
      size: Size.infinite,
    );
  }
}

// Custom painter for the heart rate graph
class _HeartRateGraphPainter extends CustomPainter {
  final List<int> dataPoints;
  final Color lineColor;
  
  _HeartRateGraphPainter({
    required this.dataPoints,
    required this.lineColor,
  });
  
  @override
  void paint(Canvas canvas, Size size) {
    if (dataPoints.isEmpty) return;
    
    final paint = Paint()
      ..color = lineColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;
    
    final path = Path();
    
    // Find min and max values to scale the graph
    int minValue = dataPoints.reduce((a, b) => a < b ? a : b);
    int maxValue = dataPoints.reduce((a, b) => a > b ? a : b);
    
    // Add padding to min and max
    minValue = (minValue * 0.9).floor();
    maxValue = (maxValue * 1.1).ceil();
    
    // Ensure at least 40 BPM range for visibility
    if (maxValue - minValue < 40) {
      final center = (maxValue + minValue) / 2;
      minValue = (center - 20).floor();
      maxValue = (center + 20).ceil();
    }
    
    // Calculate x and y scales
    final xScale = size.width / (dataPoints.length - 1);
    final yScale = size.height / (maxValue - minValue);
    
    // Start the path at the first point
    path.moveTo(
      0,
      size.height - (dataPoints.first - minValue) * yScale,
    );
    
    // Add points to the path
    for (int i = 1; i < dataPoints.length; i++) {
      path.lineTo(
        i * xScale,
        size.height - (dataPoints[i] - minValue) * yScale,
      );
    }
    
    // Draw the path
    canvas.drawPath(path, paint);
    
    // Draw horizontal grid lines
    final gridPaint = Paint()
      ..color = lineColor.withOpacity(0.2)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.5;
    
    final textPaint = TextPainter(
      textDirection: TextDirection.ltr,
      textAlign: TextAlign.right,
    );
    
    final gridStep = ((maxValue - minValue) / 4).round();
    for (int i = 0; i <= 4; i++) {
      final value = minValue + gridStep * i;
      final y = size.height - (value - minValue) * yScale;
      
      // Draw grid line
      canvas.drawLine(
        Offset(0, y),
        Offset(size.width, y),
        gridPaint,
      );
      
      // Draw label
      textPaint.text = TextSpan(
        text: value.toString(),
        style: TextStyle(
          color: lineColor.withOpacity(0.7),
          fontSize: 10,
        ),
      );
      textPaint.layout();
      textPaint.paint(
        canvas,
        Offset(-textPaint.width - 4, y - textPaint.height / 2),
      );
    }
  }
  
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) {
    return true;
  }
}