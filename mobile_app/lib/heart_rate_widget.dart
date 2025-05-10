import 'dart:async';
import 'package:flutter/material.dart';
import 'heart_rate_monitor.dart';

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
    });
  }
  
  void _setupHeartRateAlertCheck() {
    // Check for high heart rate every 30 seconds
    _alertCheckTimer = Timer.periodic(const Duration(seconds: 30), (_) async {
      final result = await _heartRateService.checkHighHeartRate(widget.email);
      
      setState(() {
        _isHighHeartRate = result['alert'] == true;
        if (_isHighHeartRate && result['message'] != null) {
          _alertMessage = result['message'];
        } else {
          _alertMessage = '';
        }
      });
    });
    
    // Also check immediately on start
    Future.delayed(const Duration(seconds: 2), () async {
      final result = await _heartRateService.checkHighHeartRate(widget.email);
      
      setState(() {
        _isHighHeartRate = result['alert'] == true;
        if (_isHighHeartRate && result['message'] != null) {
          _alertMessage = result['message'];
        }
      });
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
                      '$currentBpm BPM',
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